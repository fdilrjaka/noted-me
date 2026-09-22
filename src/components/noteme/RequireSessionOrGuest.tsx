import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { isGuestMode } from "@/lib/noteme/guestMode";

/**
 * Gerbang masuk aplikasi. Dipasang di route "/" (dashboard) supaya, sesuai alur yang diminta:
 * setelah animasi pembuka, user yang belum login mendarat di halaman login (/auth) dulu.
 *
 * User yang memilih "Lanjut tanpa akun" di halaman login menyalakan flag guest-mode, jadi tidak
 * dilempar balik ke sini terus-menerus. Flag itu dihapus lagi saat login sukses ATAU saat logout
 * (lihat useAuthForm & AccountSection), supaya logout selalu berakhir di halaman login.
 */
export function RequireSessionOrGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) return null;
  if (!user && !isGuestMode()) return <Navigate to="/auth" />;

  return <>{children}</>;
}
