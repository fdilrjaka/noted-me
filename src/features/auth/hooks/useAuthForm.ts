import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/useSession";
import { syncNow } from "@/storage/sync-engine/syncNow";

/**
 * State & handler untuk form login/daftar (mode in/up, username, password).
 * Dipisah dari AuthPage karena ini alur otentikasi tersendiri, terpisah dari
 * edit profil (lihat useAvatarUpload) yang cuma relevan setelah user login.
 */
export function useAuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = username.trim();
    if (clean.length < 3) {
      toast.error("Username minimal 3 karakter");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setBusy(true);
    const email = usernameToEmail(username);

    try {
      if (mode === "up") {
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            toast.error("Username sudah dipakai — coba masuk saja");
            setMode("in");
            return;
          }
          toast.error(error.message);
          return;
        }
        // No session means the project still requires confirmation — sign in explicitly.
        if (!signUpData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            toast.error(signInError.message);
            return;
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("invalid")
              ? "Username atau password salah"
              : error.message,
          );
          return;
        }
      }

      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        try {
          // Full pull so catatan dari perangkat lain langsung muncul di sini.
          await syncNow(sess.session.user.id, { full: true });
        } catch {
          toast("Masuk berhasil, sinkronisasi dicoba lagi otomatis");
        }
      }
      toast.success(mode === "in" ? "Selamat datang kembali" : "Akun dibuat");
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return { mode, setMode, username, setUsername, password, setPassword, busy, submit };
}
