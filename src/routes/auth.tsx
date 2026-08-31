import { useEffect, useState, type CSSProperties } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, LogOut, Palette } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useSession, usernameToEmail } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { dirtyCount, useData } from "@/lib/noteme/store";
import { syncNow } from "@/lib/noteme/sync";
import {
  DEFAULT_THEME,
  readTheme,
  saveTheme,
  THEME_PRESETS,
  type ThemePreference,
} from "@/lib/noteme/theme";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — NoteMe" },
      {
        name: "description",
        content:
          "Masuk ke NoteMe dengan username dan password untuk menyinkronkan catatan kuliahmu.",
      },
      { property: "og:title", content: "Masuk — NoteMe" },
      {
        property: "og:description",
        content: "Login sederhana dengan username dan password untuk sinkronisasi catatan NoteMe.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useSession();
  const data = useData();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const updateTheme = (next: ThemePreference) => {
    setTheme(next);
    saveTheme(next);
  };

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

  return (
    <main
      ref={registerNavDragTarget}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 safe-top safe-bottom-lg"
    >
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label="Kembali"
          className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Akun</h1>
      </header>

      <section className="glass-card spring-in mt-4 rounded-3xl p-5" aria-labelledby="theme-title">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <div>
            <h2 id="theme-title" className="text-sm font-semibold">
              Warna tampilan
            </h2>
            <p className="text-xs text-muted-foreground">Gradient tetap berpadu dengan ungu.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              aria-label={`Pilih warna ${preset.label}`}
              aria-pressed={theme.color === preset.value}
              onClick={() => updateTheme({ ...theme, color: preset.value })}
              className="theme-swatch press-sm flex size-10 items-center justify-center rounded-full active:scale-90"
              style={{ "--swatch-color": preset.value } as CSSProperties}
            >
              {theme.color === preset.value && <Check className="size-4" />}
            </button>
          ))}
          <label className="theme-picker press-sm flex size-10 cursor-pointer items-center justify-center rounded-full">
            <span className="sr-only">Pilih warna sendiri</span>
            <input
              type="color"
              value={theme.color}
              onChange={(event) => updateTheme({ ...theme, color: event.target.value })}
              className="absolute size-px opacity-0"
            />
            <Palette className="size-4" />
          </label>
        </div>

        <label className="mt-4 block text-xs text-muted-foreground">
          Intensitas warna <span className="float-right text-foreground">{theme.intensity}%</span>
          <input
            type="range"
            min="18"
            max="70"
            step="1"
            value={theme.intensity}
            onChange={(event) =>
              updateTheme({ ...theme, intensity: Number(event.target.value) })
            }
            className="theme-slider mt-2 w-full"
          />
        </label>
      </section>

      {user ? (
        <div className="glass-card spring-in mt-6 rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Masuk sebagai</p>
          <p className="text-lg font-semibold">{user.email?.replace("@noteme.app", "")}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {dirtyCount() > 0
              ? `${dirtyCount()} perubahan menunggu sinkronisasi.`
              : "Semua catatan tersinkron."}
          </p>
          <button
            onClick={async () => {
              await syncNow(user.id).catch(() => toast.error("Sinkronisasi gagal"));
              await supabase.auth.signOut();
              toast.success("Keluar — catatan tetap ada di perangkat");
              void navigate({ to: "/" });
            }}
            className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium active:scale-95"
          >
            <LogOut className="size-4" /> Sinkron lalu keluar
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {data.subjects.filter((s) => !s.deleted).length} mata kuliah tersimpan
          </p>
        </div>
      ) : (
        <div className="glass-card spring-in mt-6 rounded-3xl p-6">
          <h2 className="text-xl font-bold tracking-tight">
            {mode === "in" ? "Masuk" : "Buat akun"}
          </h2>
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
            {mode === "in" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
          <Link to="/" className="press-sm mt-3 block text-center text-sm text-primary underline">
            Lanjut tanpa akun
          </Link>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
