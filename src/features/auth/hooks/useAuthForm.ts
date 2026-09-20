import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/useSession";
import { syncNow } from "@/storage/sync-engine/syncNow";
import { ensureLocalOwner, localDataBelongsToOther } from "@/storage/local/localOwner";
import {
  USERNAME_MIN,
  newUsernameError,
  normalizeUsername,
  passwordErrorMessage,
} from "@/lib/noteme/credentialPolicy";
import {
  generateRecoveryCodes,
  resetPasswordWithRecoveryCode,
} from "@/features/auth/recovery.functions";

/**
 * State & handler untuk form login/daftar/lupa password (mode in/up/forgot).
 * Dipisah dari AuthPage karena ini alur otentikasi tersendiri, terpisah dari
 * edit profil (lihat useAvatarUpload) yang cuma relevan setelah user login.
 */
export function useAuthForm() {
  const navigate = useNavigate();
  const [mode, setModeState] = useState<"in" | "up" | "forgot">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Kode pemulihan yang baru dibuat saat daftar; dialognya menahan navigasi sampai user menyimpannya.
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);

  const setMode = (next: "in" | "up" | "forgot") => {
    setModeState(next);
    setConfirmPassword("");
    setRecoveryCode("");
  };

  const finishSignup = () => {
    setNewRecoveryCodes(null);
    void navigate({ to: "/" });
  };

  const submitReset = async () => {
    if (normalizeUsername(username).length < USERNAME_MIN) {
      toast.error(`Username minimal ${USERNAME_MIN} karakter`);
      return;
    }
    if (!recoveryCode.trim()) {
      toast.error("Masukkan salah satu kode pemulihan yang kamu simpan saat mendaftar");
      return;
    }
    const policy = passwordErrorMessage(password);
    if (policy) {
      toast.error(policy);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }
    setBusy(true);
    try {
      const res = await resetPasswordWithRecoveryCode({
        data: { username, code: recoveryCode, newPassword: password },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        res.remaining <= 2
          ? `Password diganti. Sisa ${res.remaining} kode pemulihan, buat kode baru di Pengaturan setelah masuk`
          : "Password berhasil diganti. Silakan masuk dengan password baru",
      );
      setPassword("");
      setMode("in");
    } catch {
      toast.error("Gagal mengatur ulang password. Coba lagi sebentar lagi");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (mode === "forgot") {
      await submitReset();
      return;
    }
    const clean = username.trim();
    if (mode === "up") {
      // Aturan ketat hanya untuk akun BARU. Login tidak boleh menolak akun lama yang passwordnya
      // dibuat sebelum aturan karakter spesial ada.
      const usernameError = newUsernameError(username);
      if (usernameError) {
        toast.error(usernameError);
        return;
      }
      const passwordError = passwordErrorMessage(password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    } else {
      if (clean.length < USERNAME_MIN) {
        toast.error(`Username minimal ${USERNAME_MIN} karakter`);
        return;
      }
      if (!password) {
        toast.error("Password wajib diisi");
        return;
      }
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
        const uid = sess.session.user.id;
        // Perangkat ini masih menyimpan catatan akun lain: jangan dibuang diam-diam, dan jangan
        // pernah di-push ke akun ini. Kalau user menolak, batalkan login.
        if (
          localDataBelongsToOther(uid) &&
          !window.confirm(
            "Perangkat ini masih menyimpan catatan dari akun lain. Masuk sebagai akun ini akan menghapus catatan lokal tersebut dari perangkat (catatan di server akun lain tidak terpengaruh). Lanjutkan?",
          )
        ) {
          await supabase.auth.signOut();
          return;
        }
        await ensureLocalOwner(uid);
        try {
          // Full pull so catatan dari perangkat lain langsung muncul di sini.
          await syncNow(sess.session.user.id, { full: true });
        } catch {
          toast("Masuk berhasil, sinkronisasi dicoba lagi otomatis");
        }
      }
      if (mode === "up") {
        // Akun memakai email palsu, jadi tidak ada reset lewat email: kode pemulihan adalah satu-
        // satunya jalan kalau lupa password. Tampilkan sekarang, dan tahan navigasi.
        const generated = await generateRecoveryCodes({ data: { password } }).catch(() => null);
        if (generated?.ok) {
          toast.success("Akun dibuat");
          setNewRecoveryCodes(generated.codes);
          return;
        }
        toast(
          "Akun dibuat, tapi kode pemulihan belum bisa dibuat. Buat lewat Pengaturan setelah masuk",
        );
      } else {
        toast.success("Selamat datang kembali");
      }
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return {
    mode,
    setMode,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    recoveryCode,
    setRecoveryCode,
    busy,
    submit,
    newRecoveryCodes,
    finishSignup,
  };
}
