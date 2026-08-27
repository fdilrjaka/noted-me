import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { dirtyCount, loadLocal, useData } from "@/lib/noteme/store";
import { syncNow } from "@/lib/noteme/sync";

export function SyncStatus() {
  const { user } = useSession();
  const data = useData();
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<"idle" | "syncing" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!user || !online) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState("syncing");
      syncNow(user.id)
        .then(() => setState("idle"))
        .catch((error: unknown) => {
          setState("error");
          console.error("sync failed", error);
        });
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // re-run whenever local data changes so edits push automatically
  }, [user, online, data]);

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
        setState("syncing");
        syncNow(user.id)
          .then(() => {
            setState("idle");
            toast.success("Tersinkron");
          })
          .catch(() => setState("error"));
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
          <CloudOff className="size-3.5 text-destructive" /> Gagal sync
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
