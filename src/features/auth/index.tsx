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

function AuthScreen() {
  const form = useAuthForm();

  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-10 safe-top safe-bottom-lg bg-white"
      style={{
        // Titik-titik kanvas tak terbatas — sama persis dengan pola di CanvasSurface,
        // bukan garis kotak-kotak, supaya halaman login terasa seperti "sebelum masuk kanvas".
        backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Glow lembut, pakai warna glow yang sama dengan sisa aplikasi */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 15% 20%, var(--glow-green), transparent 70%), " +
            "radial-gradient(ellipse 50% 50% at 90% 80%, var(--glow-blue), transparent 70%)",
          opacity: 0.5,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/60" />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Sapaan Teks & Ilustrasi Kiri (Layar Desktop / LG+) */}
        <div className="hidden max-w-xl flex-col lg:flex flex-1">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground">
            Selamat Datang
            <br />
            di NoteMe!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Selamat bergabung menjadi bagian dari NoteMe.
          </p>

          {/* Ilustrasi Kanvas & Kursor */}
          <div className="mt-6 w-full">
            <CollabIllustration />
          </div>
        </div>

        {/* Sapaan Teks Atas (Layar Mobile / HP) */}
        <div className="flex w-full max-w-sm flex-col items-center text-center lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Selamat Datang di NoteMe!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
