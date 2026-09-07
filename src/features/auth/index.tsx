import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { useSession } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { useAuthForm } from "./hooks/useAuthForm";
import { ProfileCard } from "./components/ProfileCard";
import { AuthForm } from "./components/AuthForm";

export function AuthPage() {
  const { user } = useSession();
  const form = useAuthForm();

  return (
    <main
      ref={registerNavDragTarget}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 safe-top safe-bottom-lg md:pl-[16.5rem]"
    >
      <Sidebar />
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

      {user ? <ProfileCard user={user} /> : <AuthForm form={form} />}

      <BottomNav />
    </main>
  );
}
