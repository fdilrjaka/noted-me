import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { setGuestMode } from "@/lib/noteme/guestMode";

const INPUT_ICON =
  "glass-input w-full rounded-2xl py-3 pl-11 pr-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";
const INPUT =
  "glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

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
          : "Selamat bergabung menjadi bagian dari NoteMe."}
      </p>

      <div className="relative mt-5">
        <Mail className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
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
        <div className="relative mt-2">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={enterOn}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className={`${INPUT_ICON} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
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
