import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { useAuthForm } from "./hooks/useAuthForm";
import { AuthForm } from "./components/AuthForm";
import { CollabIllustration } from "./components/CollabIllustration";
import { AuthDecorations } from "./components/AuthDecorations";

/**
 * Halaman login NoteMe dengan tampilan infinite canvas putih bersih,
 * ilustrasi alur node kolaboratif profesional, dan kartu form login modern.
 */
export function AuthPage() {
  const { user, loading } = useSession();

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return <AuthScreen />;
}

function AuthScreen() {
  const form = useAuthForm();

  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-12 safe-top safe-bottom-lg bg-white selection:bg-slate-900 selection:text-white"
      style={{
        // Kanvas tak terbatas putih bersih dengan pola titik-titik rapi (dot grid)
        backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Dekorasi kanvas: floating dock kiri, sticky notes, zoom control kanan bawah */}
      <AuthDecorations />

      <div className="relative z-10 flex w-full max-w-7xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        {/* Kolom Kiri: Sapaan Judul & Ilustrasi Node Kanvas Kolaboratif (Desktop) */}
        <div className="hidden max-w-2xl flex-col lg:flex flex-1 pl-4">
          <div className="relative">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Selamat Datang
              <br />
              di NoteMe!
            </h1>
            {/* Coretan doodle tipis aksen di samping judul */}
            <svg
              className="absolute -top-3 left-[280px] h-8 w-8 text-sky-400/90 pointer-events-none select-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M7 17L12 7" />
              <path d="M14 19L19 9" />
            </svg>
          </div>

          <p className="mt-3 text-base font-normal text-slate-500">
            Selamat bergabung menjadi bagian dari NoteMe.
          </p>

          {/* Ilustrasi Kanvas Node & Garis Konektor */}
          <div className="mt-6 w-full">
            <CollabIllustration />
          </div>
        </div>

        {/* Sapaan Teks Atas (Layar Mobile) */}
        <div className="flex w-full max-w-sm flex-col items-center text-center lg:hidden">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Selamat Datang di NoteMe!
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Selamat bergabung menjadi bagian dari NoteMe.
          </p>
        </div>

        {/* Box Form Login Kanan */}
        <div className="w-full max-w-[440px] flex justify-center lg:justify-end">
          <AuthForm form={form} />
        </div>
      </div>
    </main>
  );
}