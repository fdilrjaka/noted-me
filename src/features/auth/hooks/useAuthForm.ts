import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { syncNow } from "@/storage/sync-engine/syncNow";
import { ensureLocalOwner, localDataBelongsToOther } from "@/storage/local/localOwner";
import { clearGuestMode } from "@/lib/noteme/guestMode";
import { newEmailError, normalizeEmail, passwordErrorMessage } from "@/lib/noteme/credentialPolicy";

/**
 * State & handler untuk form login/daftar/lupa password/verifikasi kode (mode in/up/forgot/verify).
 *
 * Login sekarang pakai EMAIL asli (bukan username):
 *  - Daftar: buat akun lalu kirim kode 6 digit ke email untuk diverifikasi sebelum bisa masuk.
 *  - Masuk: email + password langsung, ATAU tombol "Masuk dengan Google" (OAuth, tidak lewat
 *    form ini — lihat signInWithGoogle).
 *  - Lupa password: kirim kode 6 digit ke email, verifikasi, lalu atur password baru.
 */
export function useAuthForm() {
  const navigate = useNavigate();
  const [mode, setModeState] = useState<"in" | "up" | "forgot" | "verify">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  // Mode form sebelum masuk ke layar verifikasi, supaya tombol "kembali" tahu harus ke mana.
  const [verifyFor, setVerifyFor] = useState<"signup" | "recovery" | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  const setMode = (next: "in" | "up" | "forgot" | "verify") => {
    setModeState(next);
    setConfirmPassword("");
    setOtp("");
  };

  const finishAfterLogin = async () => {
    clearGuestMode();
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
    toast.success("Selamat datang");
    void navigate({ to: "/" });
  };

  /** Masuk dengan akun Google. Redirect balik ke halaman ini setelah otorisasi. */
  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      // Kalau sukses, browser di-redirect ke Google — kode di bawah ini tidak sempat jalan.
    } finally {
      setBusy(false);
    }
  };

  const submitSignIn = async () => {
    const clean = normalizeEmail(email);
    if (newEmailError(clean)) {
      toast.error(newEmailError(clean)!);
      return;
    }
    if (!password) {
      toast.error("Password wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not confirmed") || msg.includes("not verified")) {
          // Akun ada tapi belum verifikasi email — kirim ulang kode dan lanjutkan ke verifikasi.
          const { error: otpError } = await supabase.auth.resend({ type: "signup", email: clean });
          if (otpError) {
            toast.error(otpError.message);
            return;
          }
          setPendingEmail(clean);
          setVerifyFor("signup");
          toast("Email belum diverifikasi. Kode verifikasi baru sudah dikirim");
          setMode("verify");
          return;
        }
        toast.error(msg.includes("invalid") ? "Email atau password salah" : error.message);
        return;
      }
      await finishAfterLogin();
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async () => {
    const clean = normalizeEmail(email);
    const emailError = newEmailError(clean);
    if (emailError) {
      toast.error(emailError);
      return;
    }
    const passwordError = passwordErrorMessage(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: clean, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          toast.error("Email sudah terdaftar — coba masuk saja");
          setMode("in");
          return;
        }
        toast.error(error.message);
        return;
      }
      // Kalau project mengharuskan konfirmasi email, belum ada sesi sampai kode diverifikasi.
      if (!data.session) {
        setPendingEmail(clean);
        setPendingPassword(password);
        setVerifyFor("signup");
        toast.success("Kode verifikasi dikirim ke email kamu");
        setMode("verify");
        return;
      }
      await finishAfterLogin();
    } finally {
      setBusy(false);
    }
  };

  /** Kirim kode 6 digit untuk atur ulang password (mode lupa password). */
  const submitForgot = async () => {
    const clean = normalizeEmail(email);
    const emailError = newEmailError(clean);
    if (emailError) {
      toast.error(emailError);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clean);
      if (error) {
        toast.error(error.message);
        return;
      }
      setPendingEmail(clean);
      setVerifyFor("recovery");
      toast.success("Kode verifikasi dikirim ke email kamu");
      setMode("verify");
    } finally {
      setBusy(false);
    }
  };

  /** Verifikasi kode 6 digit yang dikirim ke email (untuk daftar ATAU lupa password). */
  const submitVerify = async () => {
    if (!otp.trim()) {
      toast.error("Masukkan kode yang dikirim ke email kamu");
      return;
    }
    if (!verifyFor) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp.trim(),
        type: verifyFor,
      });
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("expired")
            ? "Kode sudah kedaluwarsa, minta kode baru"
            : "Kode salah, coba lagi",
        );
        return;
      }

      if (verifyFor === "signup") {
        // Kalau signUp tadi belum otomatis login, pastikan sesi ada dengan password yang tadi dibuat.
        if (!data.session && pendingPassword) {
          await supabase.auth.signInWithPassword({ email: pendingEmail, password: pendingPassword });
        }
        setPendingPassword("");
        toast.success("Email terverifikasi");
        await finishAfterLogin();
        return;
      }

      // verifyFor === "recovery": verifyOtp sudah membuat sesi sementara, sekarang tinggal
      // atur password baru sebelum lanjut.
      const policy = passwordErrorMessage(password);
      if (policy) {
        toast.error(policy);
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Konfirmasi password tidak sama");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        toast.error(updateError.message);
        return;
      }
      toast.success("Password berhasil diganti. Silakan masuk dengan password baru");
      setPassword("");
      setConfirmPassword("");
      await supabase.auth.signOut();
      setMode("in");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!verifyFor || !pendingEmail) return;
    setBusy(true);
    try {
      if (verifyFor === "signup") {
        const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail });
        if (error) toast.error(error.message);
        else toast.success("Kode baru dikirim");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(pendingEmail);
        if (error) toast.error(error.message);
        else toast.success("Kode baru dikirim");
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (mode === "verify") return submitVerify();
    if (mode === "forgot") return submitForgot();
    if (mode === "up") return submitSignUp();
    return submitSignIn();
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    otp,
    setOtp,
    busy,
    submit,
    signInWithGoogle,
    resendOtp,
    pendingEmail,
    verifyFor,
  };
}
