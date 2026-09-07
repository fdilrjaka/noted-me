import { Link } from "@tanstack/react-router";
import type { useAuthForm } from "../hooks/useAuthForm";

export function AuthForm({ form }: { form: ReturnType<typeof useAuthForm> }) {
  const { mode, setMode, username, setUsername, password, setPassword, busy, submit } = form;

  return (
    <div className="glass-card spring-in mt-6 rounded-3xl p-6">
      <h2 className="text-xl font-bold tracking-tight">{mode === "in" ? "Masuk" : "Buat akun"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Catatan tetap berjalan offline. Akun hanya untuk sinkronisasi antar perangkat.
      </p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        autoCapitalize="none"
        autoComplete="username"
        className="glass-input mt-5 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        type="password"
        placeholder="Password"
        autoComplete={mode === "in" ? "current-password" : "new-password"}
        className="glass-input mt-2 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
      <button
        disabled={busy}
        onClick={() => void submit()}
        className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
      >
        {busy ? "Memproses…" : mode === "in" ? "Masuk" : "Daftar"}
      </button>
      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="press-sm mt-4 w-full text-center text-sm text-muted-foreground"
      >
        {mode === "in" ? (
          <>
            Belum punya akun?{" "}
            <span className="font-semibold text-primary underline underline-offset-2">Daftar</span>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <span className="font-semibold text-primary underline underline-offset-2">Masuk</span>
          </>
        )}
      </button>
      <Link to="/" className="press-sm mt-3 block text-center text-sm text-primary underline">
        Lanjut tanpa akun
      </Link>
    </div>
  );
}
