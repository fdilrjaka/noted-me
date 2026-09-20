import { Link } from "@tanstack/react-router";
import { Crown, Search } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/noteme/BrandMark";
import { useTodoOwner } from "../hooks/useTodoOwner";
import { OwnerAvatar } from "./OwnerAvatar";

export function TodoTopBar({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const owner = useTodoOwner();
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 md:gap-4 md:px-5">
      <Link to="/" aria-label="NoteMe" className="flex flex-none items-center gap-2.5">
        <BrandLogo className="size-9" />
        <span className="hidden text-2xl font-bold tracking-tight sm:inline">NoteMe</span>
      </Link>

      <label className="relative mx-auto flex h-11 w-full max-w-2xl flex-1 items-center">
        <Search className="pointer-events-none absolute left-3.5 size-5 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search noteMe"
          aria-label="Cari task"
          className="h-full w-full rounded-xl border border-slate-300/70 bg-white/60 pl-11 pr-4 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 dark:border-white/15 dark:bg-white/5"
        />
      </label>

      <Link
        to="/auth"
        aria-label="Profil"
        className="press-sm flex-none rounded-full ring-2 ring-white/80 dark:ring-white/10"
      >
        <OwnerAvatar owner={owner} className="size-10 text-base" />
      </Link>
      <button
        type="button"
        onClick={() => toast.info("Paket Upgrade belum tersedia.")}
        className="press-sm hidden h-10 flex-none items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-[15px] font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300 sm:flex"
      >
        <Crown className="size-5" /> Upgrade
      </button>
    </header>
  );
}
