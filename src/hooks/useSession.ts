import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername } from "@/lib/noteme/credentialPolicy";
import { clearGuestMode } from "@/lib/noteme/guestMode";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      // Ada sesi (login manual, verifikasi OTP, atau redirect balik dari Google OAuth): pastikan
      // flag "lanjut tanpa akun" tidak nyangkut, supaya logout berikutnya balik ke halaman login.
      if (next) clearGuestMode();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export function usernameToEmail(username: string) {
  // Dulu ada cabang `clean.includes("@")` di sini yang tidak pernah bisa true (regex di atasnya
  // sudah membuang "@"), jadi selalu berakhir di domain palsu ini. Dihapus; perilakunya sama.
  return `${normalizeUsername(username)}@noteme.app`;
}
