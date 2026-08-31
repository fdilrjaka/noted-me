import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { dirtyCount, loadLocal, useData } from "@/lib/noteme/store";
import { syncNow } from "@/lib/noteme/sync";

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
  return msg ? `Sync gagal: ${msg} — akan dicoba lagi otomatis.` : "Sync gagal — akan dicoba lagi otomatis.";
}

export function SyncStatus() {
  const { user } = useSession();
  const data = useData();
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<"idle" | "syncing" | "error">("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const hasWarnedThisFailure = useRef(false);

  useEffect(() => {
    loadLocal();
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

  const pending = dirtyCount();

  function clearRetry() {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }

  function attemptSync(userId: string, opts?: { announceSuccess?: boolean }) {
    setState("syncing");
    syncNow(userId)
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
  }, [user, online, data]);

  // Coming back online should retry right away instead of waiting for the backoff timer.
  useEffect(() => {
    if (online && user && state === "error") {
      retryAttempt.current = 0;
      attemptSync(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => clearRetry, []);

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
