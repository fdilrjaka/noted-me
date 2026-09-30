import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, User, Phone, ShieldCheck } from "lucide-react";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { setGuestMode } from "@/lib/noteme/guestMode";
import { markWelcomeIntroPending } from "@/lib/noteme/welcomeIntro";

const CARD =
  "w-full max-w-[420px] rounded-3xl bg-neutral-50 p-7 sm:p-9 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)] border border-white/10 relative z-20";
const FIELD =
  "w-full rounded-2xl border border-neutral-200 bg-neutral-100 py-3.5 pl-12 pr-4 text-[15px] text-neutral-900 placeholder:text-neutral-500 outline-none transition-colors focus:border-neutral-900 focus:bg-white";
const BUTTON_PRIMARY =
  "w-full rounded-2xl bg-neutral-900 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-black active:scale-[0.99] disabled:opacity-60";
const ICON = "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-500";

/** Input dengan ikon di kiri (dan tombol lihat/sembunyikan password bila `secret`). */
function Field({
  icon: Icon,
  secret = false,
  className = "",
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  secret?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <Icon className={ICON} />
      <input
        {...props}
        type={secret ? (show ? "text" : "password") : props.type}
        className={`${FIELD} ${secret ? "pr-12" : ""}`}
      />
      {secret && (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-900"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      )}
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h2>
      <p className="mt-2 text-[15px] text-neutral-500">{subtitle}</p>
    </div>
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
    fullName,
    setFullName,
    phone,
    setPhone,
    rememberMe,
    setRememberMe,
    agreeTerms,
    setAgreeTerms,
    otp,
    setOtp,
    busy,
    submit,
    resendOtp,
    pendingEmail,
    verifyFor,
  } = form;

  const enterOn = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  const guestLink = (
    <Link
      to="/"
      onClick={() => {
        setGuestMode();
        markWelcomeIntroPending();
      }}
      className="text-xs text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-700"
    >
      Continue without an account
    </Link>
  );

  // ── Verifikasi kode 6 digit (daftar / lupa password) ────────────────────────
  if (mode === "verify") {
    return (
      <div className={CARD}>
        <Header
          title="Verify Email"
          subtitle={
            <>
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-neutral-900">{pendingEmail}</span>
            </>
          }
        />

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          onKeyDown={enterOn}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${FIELD} pl-4 text-center font-mono text-xl tracking-[0.4em]`}
        />

        {verifyFor === "recovery" && (
          <div className="mt-3 space-y-3">
            <Field
              icon={Lock}
              secret
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
            />
            <Field
              icon={ShieldCheck}
              secret
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={enterOn}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <PasswordHint password={password} className="px-1" />
          </div>
        )}

        <button disabled={busy} onClick={() => void submit()} className={`${BUTTON_PRIMARY} mt-6`}>
          {busy ? "Processing…" : "Verify"}
        </button>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-neutral-500">
          <button
            onClick={() => void resendOtp()}
            disabled={busy}
            className="underline transition-colors hover:text-neutral-900 disabled:opacity-60"
          >
            Resend code
          </button>
          <button
            onClick={() => setMode("in")}
            className="underline transition-colors hover:text-neutral-900"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Lupa password ───────────────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className={CARD}>
        <Header
          title="Forgot Password"
          subtitle="Enter your account email and we'll send a code to reset your password."
        />
        <Field
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={enterOn}
          placeholder="Email Address"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
        />
        <button disabled={busy} onClick={() => void submit()} className={`${BUTTON_PRIMARY} mt-5`}>
          {busy ? "Processing…" : "Send Code"}
        </button>
        <p className="mt-6 text-center text-sm text-neutral-500">
          Remember your password?{" "}
          <button
            type="button"
            onClick={() => setMode("in")}
            className="font-semibold text-neutral-950 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    );
  }

  // ── Login / Sign Up ─────────────────────────────────────────────────────────
  const isSignUp = mode === "up";

  return (
    <div className={CARD}>
      <Header
        title={isSignUp ? "Create Account" : "Welcome Back"}
        subtitle={isSignUp ? "Create a new account" : "Sign in to your account"}
      />

      {/* Tab Login / Sign Up */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5">
        {(
          [
            ["in", "Login"],
            ["up", "Sign Up"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-xl py-2.5 text-[15px] font-medium transition-all ${
              mode === value
                ? "bg-white text-neutral-950 shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        {isSignUp && (
          <Field
            icon={User}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            autoComplete="name"
          />
        )}

        <Field
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Field
          icon={Lock}
          secret
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={isSignUp ? undefined : enterOn}
          placeholder="Password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />

        {isSignUp && (
          <>
            {password.length > 0 && <PasswordHint password={password} className="px-1" />}
            <Field
              icon={ShieldCheck}
              secret
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              autoComplete="new-password"
            />
            <Field
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={enterOn}
              placeholder="Phone Number (Optional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </>
        )}
      </div>

      {isSignUp ? (
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="size-4 shrink-0 cursor-pointer rounded accent-neutral-900"
          />
          <span>
            I agree to the <span className="font-medium text-neutral-950">Terms of Service</span>{" "}
            and <span className="font-medium text-neutral-950">Privacy Policy</span>
          </span>
        </label>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2.5 text-neutral-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 shrink-0 cursor-pointer rounded accent-neutral-900"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="font-medium text-neutral-950 hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}

      <button disabled={busy} onClick={() => void submit()} className={`${BUTTON_PRIMARY} mt-5`}>
        {busy ? "Processing…" : isSignUp ? "Create Account" : "Sign In"}
      </button>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "in" : "up")}
          className="font-semibold text-neutral-950 hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </p>

      <div className="mt-3 flex justify-center">{guestLink}</div>
    </div>
  );
}
