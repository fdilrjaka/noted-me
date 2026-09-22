import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { useAuthForm } from "./hooks/useAuthForm";
import { AuthForm } from "./components/AuthForm";
import { BrandLogo } from "@/components/noteme/BrandMark";

/**
 * Halaman login mandiri — ini satu-satunya tempat untuk masuk/daftar. Tidak ada halaman
 * "edit profil" terpisah: setelah login, semua urusan profil/akun ada di Settings.
 *
 * Box login SELALU di tengah layar (bukan di dalam layout Sidebar/BottomNav biasa), dan ini
 * yang tampil pertama kali setelah animasi pembuka kalau belum ada sesi (lihat guard di
 * routes/index.tsx). Kalau ternyata sudah ada sesi (mis. buka /auth manual saat sudah login),
 * langsung dilempar ke dashboard.
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
    <main className="flex min-h-dvh w-full items-center justify-center px-4 safe-top safe-bottom-lg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="size-14" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">NoteMe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catatan kuliah offline-first dengan sinkronisasi otomatis.
          </p>
        </div>
        <AuthForm form={form} />
      </div>
    </main>
  );
}
