import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { useAuthForm } from "./hooks/useAuthForm";
import { AuthForm } from "./components/AuthForm";
import { CollabIllustration } from "./components/CollabIllustration";

/**
 * Halaman login mandiri — ini satu-satunya tempat untuk masuk/daftar. Tidak ada halaman
 * "edit profil" terpisah: setelah login, semua urusan profil/akun ada di Settings.
 */
export function AuthPage() {
  const { user, loading } = useSession();

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return <AuthScreen />;
}

// Kertas kotak-kotak (grid paper) latar belakang
const GRID_BACKGROUND =
  "linear-gradient(rgba(100,116,139,0.14) 1px, transparent 1px), " +
  "linear-gradient(90deg, rgba(100,116,139,0.14) 1px, transparent 1px)";

function AuthScreen() {
  const form = useAuthForm();

  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-10 safe-top safe-bottom-lg"
      style={{
        backgroundColor: "#c7d2de",
        backgroundImage: GRID_BACKGROUND,
        backgroundSize: "36px 36px",
      }}
    >
      {/* Soft Radial Overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(255,255,255,0.35), transparent), " +
            "radial-gradient(ellipse 60% 60% at 85% 70%, rgba(148,163,184,0.25), transparent)",
        }}
      />

      <div
        className="relative flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 z-10"
        style={
          {
            "--card": "#ffffff",
            "--card-foreground": "#0f172a",
            "--border": "#e2e8f0",
            "--input": "#f8fafc",
            "--muted-foreground": "#64748b",
            "--primary": "#445164",
            "--primary-foreground": "#ffffff",
            "--ring": "#445164",
          } as React.CSSProperties
        }
      >
        {/* Sapaan Teks & Ilustrasi Kiri (Layar Desktop / LG+) */}
        <div className="hidden max-w-xl flex-col lg:flex flex-1">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-700">
            Selamat Datang
            <br />
            di NoteMe!
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Selamat bergabung menjadi bagian dari NoteMe.
          </p>

          {/* Ilustrasi Kanvas & Kursor */}
          <div className="mt-6 w-full">
            <CollabIllustration />
          </div>
        </div>

        {/* Sapaan Teks Atas (Layar Mobile / HP) */}
        <div className="flex w-full max-w-sm flex-col items-center text-center lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-slate-700">
            Selamat Datang di NoteMe!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Selamat bergabung menjadi bagian dari NoteMe.
          </p>
        </div>

        {/* Box Form Login Kanan */}
        <div className="w-full max-w-md flex justify-center lg:justify-end">
          <AuthForm form={form} />
        </div>
      </div>
    </main>
  );
}
