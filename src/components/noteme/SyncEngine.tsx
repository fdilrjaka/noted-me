import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { dirtyCount, loadLocal, useData } from "@/lib/noteme/store";
import { resolveConflict, syncNow, useConflicts, diffPageContent } from "@/lib/noteme/sync";
import { dirtyTodoCount, loadTodoLocal, useTodoData } from "@/lib/noteme/todoStore";
import { syncTodoNow } from "@/lib/noteme/todoSync";
import { dirtyScheduleCount, loadScheduleLocal, useScheduleData } from "@/lib/noteme/scheduleStore";
import { syncScheduleNow } from "@/lib/noteme/scheduleSync";

// Debounce realtime-triggered sync sedikit — kalau device lain nyimpen beberapa
// baris sekaligus (mis. subject + beberapa page), event postgres_changes bisa
// nyampe beruntun; gak perlu langsung sync di tiap event, cukup sekali abis diam.
const REALTIME_DEBOUNCE_MS = 400;

// Backoff steps for auto-retry after a failed sync (ms). Caps at the last value.
const RETRY_DELAYS = [3000, 8000, 20000, 45000, 60000];

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true; // fetch throws TypeError on network failure
  const msg = error instanceof Error ? error.message : String(error);
  return /fetch|network|failed to fetch/i.test(msg);
}

function describeSyncError(error: unknown): string {
  if (isNetworkError(error)) {
    return "Koneksi terputus saat sync — akan dicoba lagi otomatis.";
  }
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : null;
  return msg
    ? `Sync gagal: ${msg} — akan dicoba lagi otomatis.`
    : "Sync gagal — akan dicoba lagi otomatis.";
}

export function SyncStatus() {
  const { user } = useSession();
  const data = useData();
  const todoData = useTodoData();
  const scheduleData = useScheduleData();
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<"idle" | "syncing" | "error">("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const hasWarnedThisFailure = useRef(false);

  useEffect(() => {
    loadLocal();
    loadTodoLocal();
    loadScheduleLocal();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pending = dirtyCount() + dirtyTodoCount() + dirtyScheduleCount(scheduleData);

  function clearRetry() {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }

  function attemptSync(userId: string, opts?: { announceSuccess?: boolean }) {
    setState("syncing");
    Promise.all([syncNow(userId), syncTodoNow(userId), syncScheduleNow(userId)])
      .then(() => {
        setState("idle");
        retryAttempt.current = 0;
        hasWarnedThisFailure.current = false;
        clearRetry();
        if (opts?.announceSuccess) toast.success("Tersinkron");
      })
      .catch((error: unknown) => {
        setState("error");
        console.error("sync failed", error);
        // Show one toast per failure streak, not on every retry attempt.
        if (!hasWarnedThisFailure.current) {
          hasWarnedThisFailure.current = true;
          toast.error(describeSyncError(error));
        }
        // Queue an automatic retry with backoff instead of leaving it stuck on error.
        clearRetry();
        const delay = RETRY_DELAYS[Math.min(retryAttempt.current, RETRY_DELAYS.length - 1)];
        retryAttempt.current += 1;
        retryTimer.current = setTimeout(() => {
          if (navigator.onLine) attemptSync(userId);
        }, delay);
      });
  }

  useEffect(() => {
    if (!user || !online) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      attemptSync(user.id);
    }, 1200);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // re-run whenever local data changes so edits push automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, online, data, todoData, scheduleData]);

  // Coming back online should retry right away instead of waiting for the backoff timer.
  useEffect(() => {
    if (online && user && state === "error") {
      retryAttempt.current = 0;
      attemptSync(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => clearRetry, []);

  // Live sync: dengerin perubahan lewat Supabase Realtime supaya edit dari device lain
  // langsung nongol di sini tanpa nunggu user ngedit sesuatu lokal dulu (yang sebelumnya
  // jadi satu-satunya pemicu sync). Row punya user lain gak akan pernah lolos sini karena
  // RLS: koneksi realtime tetap dibatasi policy yang sama kayak query biasa.
  useEffect(() => {
    if (!user) return;

    const scheduleRealtimeSync = () => {
      if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
      realtimeTimer.current = setTimeout(() => {
        if (navigator.onLine) attemptSync(user.id);
      }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`noteme-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pages", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_images", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_sections", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_tasks", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_classes", filter: `user_id=eq.${user.id}` },
        scheduleRealtimeSync,
      )
      .subscribe();

    return () => {
      if (realtimeTimer.current) {
        clearTimeout(realtimeTimer.current);
        realtimeTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CloudOff className="size-3.5" /> Lokal
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        if (!online) {
          toast("Sedang offline — perubahan tersimpan di perangkat");
          return;
        }
        retryAttempt.current = 0;
        hasWarnedThisFailure.current = false;
        attemptSync(user.id, { announceSuccess: true });
      }}
      className="press-sm flex items-center gap-1.5 text-xs text-muted-foreground active:scale-90"
    >
      {!online ? (
        <>
          <CloudOff className="size-3.5" /> Offline
        </>
      ) : state === "syncing" ? (
        <>
          <RefreshCw className="size-3.5 animate-spin" /> Sync
        </>
      ) : state === "error" ? (
        <>
          <CloudOff className="size-3.5 text-destructive" /> Gagal, mencoba lagi
        </>
      ) : (
        <>
          <Cloud className="size-3.5" /> {pending > 0 ? `${pending} menunggu` : "Tersinkron"}
        </>
      )}
    </button>
  );
}

/**
 * Muncul kalau ada note yang lagi diedit lokal TAPI ternyata udah diubah duluan di
 * device lain (lihat doSync di lib/noteme/sync.ts). Nunjukin satu konflik pertama di
 * antrean; sengaja gak diam-diam milih salah satu — user yang mutusin timpa atau gabung.
 */
export function ConflictDialog() {
  const conflicts = useConflicts();
  const conflict = conflicts[0];

  if (!conflict) return null;

  const title = conflict.local.title || "Catatan tanpa judul";
  const titleDiffers = conflict.local.title.trim() !== conflict.remote.title.trim();
  const { removed, added, truncated } = diffPageContent(conflict.local, conflict.remote);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="glass-card spring-in w-full max-w-sm rounded-3xl p-5">
        <p className="mb-1 text-base font-semibold">Konflik sinkronisasi</p>
        <p className="text-sm text-muted-foreground">
          "{title}" juga diedit di perangkat lain. Mau timpa dengan versi lain itu, atau gabung jadi
          satu (dua-duanya disimpan)?
        </p>

        {titleDiffers && (
          <div className="mt-3 space-y-1 text-xs">
            <p className="text-muted-foreground">Judul beda:</p>
            <p className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive line-through">
              {conflict.local.title || "(tanpa judul)"}
            </p>
            <p className="rounded-lg bg-primary/10 px-2 py-1 text-primary">
              {conflict.remote.title || "(tanpa judul)"}
            </p>
          </div>
        )}

        {truncated ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Catatannya kepanjangan buat ditunjukin bagian yang beda satu-satu — tapi isinya memang
            beda.
          </p>
        ) : (
          (removed.length > 0 || added.length > 0) && (
            <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-xs">
              {removed.length > 0 && (
                <div>
                  <p className="mb-1 text-muted-foreground">
                    Cuma ada di catatan ini (hilang kalau timpa):
                  </p>
                  <div className="space-y-1">
                    {removed.map((phrase, idx) => (
                      <p
                        key={`removed-${idx}`}
                        className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive line-through"
                      >
                        {phrase}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {added.length > 0 && (
                <div>
                  <p className="mb-1 text-muted-foreground">Cuma ada di versi perangkat lain:</p>
                  <div className="space-y-1">
                    {added.map((phrase, idx) => (
                      <p
                        key={`added-${idx}`}
                        className="rounded-lg bg-primary/10 px-2 py-1 text-primary"
                      >
                        {phrase}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {conflicts.length > 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            +{conflicts.length - 1} catatan lain juga menunggu.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              resolveConflict(conflict.id, "overwrite");
              toast("Ditimpa dengan versi dari perangkat lain");
            }}
            className="press rounded-full px-4 py-2 text-sm font-medium text-muted-foreground active:scale-95"
          >
            Timpa
          </button>
          <button
            onClick={() => {
              resolveConflict(conflict.id, "merge");
              toast.success("Kedua versi digabung");
            }}
            className="press rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
          >
            Gabung
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is optional */
    });
  }, []);
  return null;
}
