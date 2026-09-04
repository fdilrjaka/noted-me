import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Berapa lama satu sinyal "lagi ngetik" dianggap masih berlaku sebelum dianggap
// berhenti (device lain gak ngirim update lagi — entah karena idle, pindah note,
// atau koneksinya putus). Dibuat > jarak kirim ulang di bawah supaya normalnya
// selalu ke-refresh duluan sebelum sempat expired.
const TYPING_TTL_MS = 2500;
// Jarak minimum antar broadcast saat user masih terus ngetik — gak perlu kirim
// tiap keystroke, cukup sering banget buat kelihatan "live".
const BROADCAST_THROTTLE_MS = 1200;

export type TypingProfile = {
  name: string;
  avatarUrl: string | null;
  avatarColor: string;
};

type TypingPayload = TypingProfile & { deviceId: string };

type Typist = TypingProfile & { deviceId: string; expiresAt: number };

// Satu id per perangkat (bukan per user — dua device login akun yang sama harus
// kebedain), disimpan di localStorage biar tetap sama antar reload/tab di device itu.
function getDeviceId(): string {
  const KEY = "noteme.deviceId";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    // localStorage gak kebuka (private mode dsb) — fallback per-sesi, cukup buat sekali pakai.
    return crypto.randomUUID();
  }
}

/**
 * Presence ephemeral pakai Supabase Realtime broadcast (BUKAN postgres_changes) —
 * sengaja gak nyentuh tabel sama sekali, jadi gak ada baris "typing" yang perlu
 * disimpan/dibersihin, dan latensinya jauh lebih rendah karena gak muter ke Postgres.
 * Scope-nya per pageId: tiap catatan channel-nya sendiri, biar sinyal ngetik di
 * catatan A gak nongol pas kamu lagi buka catatan B.
 */
export function useTypingPresence(pageId: string | null | undefined, me: TypingProfile | null) {
  const [typists, setTypists] = useState<Typist[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const deviceIdRef = useRef<string>(getDeviceId());
  const lastSentRef = useRef(0);
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    setTypists([]);
    if (!pageId) return;

    const channel = supabase.channel(`noteme-typing-${pageId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as TypingPayload;
        if (!p || p.deviceId === deviceIdRef.current) return;
        setTypists((prev) => {
          const rest = prev.filter((t) => t.deviceId !== p.deviceId);
          return [
            ...rest,
            {
              deviceId: p.deviceId,
              name: p.name,
              avatarUrl: p.avatarUrl,
              avatarColor: p.avatarColor,
              expiresAt: Date.now() + TYPING_TTL_MS,
            },
          ];
        });
      })
      .subscribe();
    channelRef.current = channel;

    // Beres-beres entry yang udah expired (device lain berhenti ngetik / kabur)
    // tanpa nunggu sinyal eksplisit "stop" — lebih tahan banting kalau tab-nya
    // ditutup paksa atau koneksinya putus mendadak.
    const pruneTimer = window.setInterval(() => {
      setTypists((prev) => {
        const now = Date.now();
        const next = prev.filter((t) => t.expiresAt > now);
        return next.length === prev.length ? prev : next;
      });
    }, 500);

    return () => {
      window.clearInterval(pruneTimer);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [pageId]);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastSentRef.current < BROADCAST_THROTTLE_MS) return;
    lastSentRef.current = now;
    const profile = meRef.current;
    if (!profile || !channelRef.current) return;
    const payload: TypingPayload = { ...profile, deviceId: deviceIdRef.current };
    void channelRef.current.send({ type: "broadcast", event: "typing", payload });
  }

  return { typists, notifyTyping };
}
