import { Link } from "@tanstack/react-router";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { setGuestMode } from "@/lib/noteme/guestMode";

const INPUT =
  "glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11C3.24 21.3 7.28 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.19 7.19 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.26A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0 7.28 0 3.24 2.7 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthForm({ form }: { form: ReturnType<typeof useAuthForm> }) {
  const {
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
  } = form;

  const title =
    mode === "in" ? "Masuk" : mode === "up" ? "Buat akun" : mode === "forgot" ? "Lupa password" : "Verifikasi email";
  const action =
    mode === "in" ? "Masuk" : mode === "up" ? "Daftar" : mode === "forgot" ? "Kirim kode" : "Verifikasi";
  const enterOn = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  if (mode === "verify") {
    return (
      <div className="glass-card spring-in mt-6 rounded-3xl p-6">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Masukkan kode 6 digit yang dikirim ke <span className="font-medium">{pendingEmail}</span>.
        </p>

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={enterOn}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${INPUT} mt-5 text-center font-mono text-lg tracking-[0.5em]`}
        />

        {verifyFor === "recovery" && (
          <>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password baru"
              autoComplete="new-password"
              className={`${INPUT} mt-2`}
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={enterOn}
              type="password"
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className={`${INPUT} mt-2`}
            />
            <PasswordHint password={password} className="mt-3 px-1" />
          </>
        )}

        <button
          disabled={busy}
          onClick={() => void submit()}
          className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
        >
          {busy ? "Memproses…" : action}
        </button>

        <button
          onClick={() => void resendOtp()}
          disabled={busy}
          className="press-sm mt-3 w-full text-center text-sm text-muted-foreground disabled:opacity-60"
        >
          Kirim ulang kode
        </button>
        <button
          onClick={() => setMode("in")}
          className="press-sm mt-1 w-full text-center text-sm text-muted-foreground"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card spring-in mt-6 rounded-3xl p-6">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "forgot"
          ? "Masukkan email akun kamu. Kami kirim kode verifikasi untuk mengatur ulang password."
          : "Catatan tetap berjalan offline. Akun hanya untuk sinkronisasi antar perangkat."}
      </p>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={busy}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold active:scale-95 disabled:opacity-60"
      >
        <GoogleIcon />
        Lanjutkan dengan Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={mode === "forgot" ? enterOn : undefined}
        placeholder="Email"
        type="email"
        autoCapitalize="none"
        autoComplete="email"
        className={INPUT}
      />

      {mode !== "forgot" && (
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={enterOn}
          type="password"
          placeholder="Password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          className={`${INPUT} mt-2`}
        />
      )}

      {mode !== "in" && mode !== "forgot" && <PasswordHint password={password} className="mt-3 px-1" />}

      {mode === "up" && (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Setelah mendaftar, kami kirim kode 6 digit ke email kamu untuk verifikasi sebelum bisa masuk.
        </p>
      )}

      <button
        disabled={busy}
        onClick={() => void submit()}
        className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
      >
        {busy ? "Memproses…" : action}
      </button>

      {mode === "in" && (
        <button
          onClick={() => setMode("forgot")}
          className="press-sm mt-3 w-full text-center text-sm text-muted-foreground"
        >
          <span className="font-semibold text-primary underline underline-offset-2">
            Lupa password?
          </span>
        </button>
      )}

      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="press-sm mt-3 w-full text-center text-sm text-muted-foreground"
      >
        {mode === "in" ? (
          <>
            Belum punya akun?{" "}
            <span className="font-semibold text-primary underline underline-offset-2">Daftar</span>
          </>
        ) : mode === "up" ? (
          <>
            Sudah punya akun?{" "}
            <span className="font-semibold text-primary underline underline-offset-2">Masuk</span>
          </>
        ) : (
          <>
            Ingat password?{" "}
            <span className="font-semibold text-primary underline underline-offset-2">
              Kembali masuk
            </span>
          </>
        )}
      </button>
      <Link
        to="/"
        onClick={() => setGuestMode()}
        className="press-sm mt-3 block text-center text-sm text-primary underline"
      >
        Lanjut tanpa akun
      </Link>
    </div>
  );
}
