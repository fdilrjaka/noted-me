import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, UserPlus, LogIn, KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { setGuestMode } from "@/lib/noteme/guestMode";
import { markWelcomeIntroPending } from "@/lib/noteme/welcomeIntro";

const INPUT_ICON =
  "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none shadow-xs transition-colors focus:border-slate-800 focus:ring-1 focus:ring-slate-800";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none shadow-xs transition-colors focus:border-slate-800 focus:ring-1 focus:ring-slate-800";
const BUTTON_PRIMARY =
  "w-full rounded-full bg-emerald-600 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60 shadow-sm flex items-center justify-center gap-2";
const CARD = "w-full max-w-[430px] rounded-3xl bg-white p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-100 relative z-20";

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
      ? "MASUK"
      : mode === "up"
        ? "BUAT AKUN"
        : mode === "forgot"
          ? "LUPA PASSWORD"
          : "VERIFIKASI EMAIL";
  const actionText =
    mode === "in"
      ? "Masuk"
      : mode === "up"
        ? "Daftar"
        : mode === "forgot"
          ? "Kirim kode"
          : "Verifikasi";
  const TitleIcon =
    mode === "in" ? LogIn : mode === "up" ? UserPlus : mode === "forgot" ? KeyRound : ShieldCheck;

  const enterOn = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  if (mode === "verify") {
    return (
      <div className={CARD}>
        <div className="mb-1 flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TitleIcon className="size-5" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          Masukkan kode 6 digit yang dikirim ke{" "}
          <span className="font-semibold text-slate-800">{pendingEmail}</span>.
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

        <button disabled={busy} onClick={() => void submit()} className={`${BUTTON_PRIMARY} mt-6`}>
          <span>{busy ? "Memproses…" : actionText}</span>
          {!busy && <ArrowRight className="size-4" />}
        </button>

        <div className="mt-6 flex flex-col items-center space-y-2 text-sm text-slate-500">
          <button
            onClick={() => void resendOtp()}
            disabled={busy}
            className="hover:text-slate-900 underline transition-colors disabled:opacity-60"
          >
            Kirim ulang kode
          </button>
          <button
            onClick={() => setMode("in")}
            className="hover:text-slate-900 underline transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <div className="mb-2 flex items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <TitleIcon className="size-5" />
        </span>
        <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
        {mode === "forgot"
          ? "Masukkan email akun kamu. Kami kirim kode verifikasi untuk mengatur ulang password."
          : "Selamat bergabung menjadi bagian dari NoteMe."}
      </p>

      {/* Input Email */}
      <div className="relative mt-4">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
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

      {/* Input Password */}
      {mode !== "forgot" && (
        <div className="relative mt-3">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
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
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
      )}

      {/* Password Hint */}
      {mode !== "in" && mode !== "forgot" && (
        <PasswordHint password={password} className="mt-3 px-1" />
      )}

      {/* Notice info text */}
      {mode === "up" && (
        <p className="mt-3 px-1 text-xs text-slate-500 leading-normal">
          Setelah mendaftar, kami kirim kode 6 digit ke email kamu untuk verifikasi sebelum bisa masuk.
        </p>
      )}

      {/* Primary Action Button */}
      <button disabled={busy} onClick={() => void submit()} className={`${BUTTON_PRIMARY} mt-6`}>
        <span>{busy ? "Memproses…" : actionText}</span>
        {!busy && <ArrowRight className="size-4" />}
      </button>

      {/* Links & Switcher */}
      <div className="mt-6 flex flex-col items-center space-y-3 text-xs sm:text-sm text-slate-500">
        {mode === "in" && (
          <button
            onClick={() => setMode("forgot")}
            className="hover:text-slate-900 transition-colors"
          >
            Lupa password?
          </button>
        )}

        <div className="flex items-center gap-1.5">
          {mode === "in" ? (
            <>
              <span>Belum punya akun?</span>
              <button
                type="button"
                onClick={() => setMode("up")}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Daftar
              </button>
            </>
          ) : mode === "up" ? (
            <>
              <span>Sudah punya akun?</span>
              <button
                type="button"
                onClick={() => setMode("in")}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Masuk
              </button>
            </>
          ) : (
            <>
              <span>Ingat password?</span>
              <button
                type="button"
                onClick={() => setMode("in")}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Kembali masuk
              </button>
            </>
          )}
        </div>

        <Link
          to="/"
          onClick={() => {
            setGuestMode();
            markWelcomeIntroPending();
          }}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-4 transition-colors pt-1"
        >
          Lanjut tanpa akun
        </Link>
      </div>
    </div>
  );
}