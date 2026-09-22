import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { setGuestMode } from "@/lib/noteme/guestMode";

const INPUT_ICON =
  "w-full rounded-2xl border border-white/70 bg-white/60 py-3.5 pl-12 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors";
const INPUT =
  "w-full rounded-2xl border border-white/70 bg-white/60 px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors";
const BUTTON =
  "w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";
const CARD = "glass-card w-[420px] rounded-3xl p-10 shadow-xl relative z-10";

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
    resendOtp,
    pendingEmail,
    verifyFor,
  } = form;
  const [showPassword, setShowPassword] = useState(false);

  const title =
    mode === "in"
      ? "Masuk"
      : mode === "up"
        ? "Buat akun"
        : mode === "forgot"
          ? "Lupa password"
          : "Verifikasi email";
  const action =
    mode === "in"
      ? "Masuk"
      : mode === "up"
        ? "Daftar"
        : mode === "forgot"
          ? "Kirim kode"
          : "Verifikasi";

  const enterOn = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  if (mode === "verify") {
    return (
      <div className={CARD}>
        <h2 className="text-muted-foreground text-sm font-semibold mb-1 uppercase tracking-wider">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Masukkan kode 6 digit yang dikirim ke{" "}
          <span className="font-semibold text-foreground">{pendingEmail}</span>.
        </p>

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={enterOn}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${INPUT} mt-2 text-center font-mono text-xl tracking-[0.5em]`}
        />

        {verifyFor === "recovery" && (
          <div className="space-y-3 mt-3">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password baru"
              autoComplete="new-password"
              className={INPUT}
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={enterOn}
              type="password"
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className={INPUT}
            />
            <PasswordHint password={password} className="mt-2 px-1" />
          </div>
        )}

        <button disabled={busy} onClick={() => void submit()} className={`${BUTTON} mt-6`}>
          {busy ? "Memproses…" : action}
        </button>

        <div className="mt-6 flex flex-col items-center space-y-2 text-sm text-muted-foreground">
          <button
            onClick={() => void resendOtp()}
            disabled={busy}
            className="hover:text-foreground underline transition-colors disabled:opacity-60"
          >
            Kirim ulang kode
          </button>
          <button
            onClick={() => setMode("in")}
            className="hover:text-foreground underline transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <h2 className="text-muted-foreground text-sm font-semibold mb-1 uppercase tracking-wider">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        {mode === "forgot"
          ? "Masukkan email akun kamu. Kami kirim kode verifikasi untuk mengatur ulang password."
          : "Selamat bergabung menjadi bagian dari NoteMe."}
      </p>

      <div className="relative mt-4">
        <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={mode === "forgot" ? enterOn : undefined}
          placeholder="E-mail"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          className={INPUT_ICON}
        />
      </div>

      {mode !== "forgot" && (
        <div className="relative mt-3">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={enterOn}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className={`${INPUT_ICON} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      )}

      {mode !== "in" && mode !== "forgot" && (
        <PasswordHint password={password} className="mt-3 px-1" />
      )}

      {mode === "up" && (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Setelah mendaftar, kami kirim kode 6 digit ke email kamu untuk verifikasi sebelum bisa
          masuk.
        </p>
      )}

      <button disabled={busy} onClick={() => void submit()} className={`${BUTTON} mt-6`}>
        {busy ? "Memproses…" : action}
      </button>

      <div className="mt-6 flex flex-col items-center space-y-3 text-sm text-muted-foreground">
        {mode === "in" && (
          <button
            onClick={() => setMode("forgot")}
            className="underline hover:text-foreground transition-colors"
          >
            Lupa password?
          </button>
        )}

        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="hover:text-foreground transition-colors"
        >
          {mode === "in" ? (
            <>
              Belum punya akun?{" "}
              <span className="font-semibold text-foreground underline underline-offset-2">
                Daftar
              </span>
            </>
          ) : mode === "up" ? (
            <>
              Sudah punya akun?{" "}
              <span className="font-semibold text-foreground underline underline-offset-2">
                Masuk
              </span>
            </>
          ) : (
            <>
              Ingat password?{" "}
              <span className="font-semibold text-foreground underline underline-offset-2">
                Kembali masuk
              </span>
            </>
          )}
        </button>

        <Link
          to="/"
          onClick={() => setGuestMode()}
          className="underline hover:text-foreground transition-colors"
        >
          Lanjut tanpa akun
        </Link>
      </div>
    </div>
  );
}
