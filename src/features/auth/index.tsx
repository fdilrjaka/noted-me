import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { useAuthForm } from "./hooks/useAuthForm";
import { AuthForm } from "./components/AuthForm";
import KineticGrid from "@/components/ui/kinetic-grid";
import SplitText from "@/components/ui/motion-split-text";

/**
 * Halaman login NoteMe dengan background Kinetic Grid interaktif
 * (grid yang melengkung mengikuti kursor dan beriak saat diklik).
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
    <KineticGrid className="min-h-dvh selection:bg-white selection:text-black">
      <main className="relative flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-12 safe-top safe-bottom-lg">
        <div className="flex w-full max-w-7xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          {/* Sapaan (desktop) */}
          <div className="hidden max-w-2xl flex-1 flex-col pl-4 lg:flex">
            <SplitText
              text={"Selamat Datang\ndi NoteMe!"}
              className="text-4xl xl:text-5xl text-white"
            />
            <p className="mt-3 text-[15px] font-normal text-white/50 leading-relaxed">
              Selamat bergabung menjadi bagian dari NoteMe.
            </p>
          </div>

          {/* Sapaan (mobile) */}
          <div className="flex w-full max-w-sm flex-col items-center text-center lg:hidden">
            <SplitText
              text="Selamat Datang di NoteMe!"
              className="text-2xl sm:text-3xl text-white"
            />
            <p className="mt-1.5 text-xs sm:text-sm text-white/50">
              Selamat bergabung menjadi bagian dari NoteMe.
            </p>
          </div>

          {/* Kartu form login */}
          <div className="w-full max-w-[420px] flex justify-center lg:justify-end">
            <AuthForm form={form} />
          </div>
        </div>
      </main>
    </KineticGrid>
  );
}
