import { Link } from "@tanstack/react-router";
import type { useAuthForm } from "../hooks/useAuthForm";
import { PasswordHint } from "./PasswordHint";
import { RecoveryCodesDialog } from "./RecoveryCodesDialog";

const INPUT =
  "glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function AuthForm({ form }: { form: ReturnType<typeof useAuthForm> }) {
  const {
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
  } = form;

  const title = mode === "in" ? "Masuk" : mode === "up" ? "Buat akun" : "Lupa password";
  const action = mode === "in" ? "Masuk" : mode === "up" ? "Daftar" : "Atur ulang password";
  const enterOn = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  return (
    <div className="glass-card spring-in mt-6 rounded-3xl p-6">
      <RecoveryCodesDialog codes={newRecoveryCodes} onDone={finishSignup} />

      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "forgot"
          ? "Masukkan username, salah satu kode pemulihan yang kamu simpan saat mendaftar, dan password baru."
          : "Catatan tetap berjalan offline. Akun hanya untuk sinkronisasi antar perangkat."}
      </p>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        autoCapitalize="none"
        autoComplete="username"
        className={`${INPUT} mt-5`}
      />

      {mode === "forgot" && (
        <input
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
          placeholder="Kode pemulihan (XXXX-XXXX-XXXX-XXXX)"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className={`${INPUT} mt-2 font-mono tracking-wider`}
        />
      )}

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={mode === "forgot" ? undefined : enterOn}
        type="password"
        placeholder={mode === "forgot" ? "Password baru" : "Password"}
        autoComplete={mode === "in" ? "current-password" : "new-password"}
        className={`${INPUT} mt-2`}
      />

      {mode === "forgot" && (
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={enterOn}
          type="password"
          placeholder="Ulangi password baru"
          autoComplete="new-password"
          className={`${INPUT} mt-2`}
        />
      )}

      {mode !== "in" && <PasswordHint password={password} className="mt-3 px-1" />}

      {mode === "up" && (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Setelah mendaftar kamu akan mendapat kode pemulihan. Simpan baik-baik: itu satu-satunya
          cara mengatur ulang password kalau lupa.
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
      <Link to="/" className="press-sm mt-3 block text-center text-sm text-primary underline">
        Lanjut tanpa akun
      </Link>
    </div>
  );
}
