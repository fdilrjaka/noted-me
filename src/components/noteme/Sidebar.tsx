import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutGrid,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/noteme/BrandMark";
import { setSidebarExpanded, toggleSidebar, useSidebarExpanded } from "@/lib/noteme/sidebarStore";

const mainItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Notes", icon: NotebookText },
  { to: "/todo", label: "To Do List", icon: LayoutGrid },
  { to: "/schedule", label: "Jadwal", icon: CalendarDays },
  { to: "/settings", label: "Pengaturan", icon: Settings },
];

const bottomItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/auth", label: "Profile", icon: User },
];

/**
 * Sidebar desktop ala desain baru: default mengecil (ikon saja). Tombol di atas memperbesar
 * sidebar (overlay, konten tidak bergeser); memilih menu atau klik di luar mengecilkannya lagi.
 * `offsetTop` dipakai halaman yang punya top bar tetap (tinggi 4rem) supaya sidebar mulai di bawahnya.
 */
export function Sidebar({ offsetTop = false }: { offsetTop?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const expanded = useSidebarExpanded();

  const renderItem = ({ to, label, icon: Icon }: (typeof mainItems)[number]) => {
    const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
    return (
      <Link
        key={to}
        to={to}
        title={expanded ? undefined : label}
        aria-label={label}
        onClick={() => setSidebarExpanded(false)}
        className={`press-sm group relative flex h-11 items-center rounded-xl text-sm font-semibold transition-colors duration-200 ${
          expanded ? "gap-3 px-3.5" : "justify-center"
        } ${
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        }`}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary"
          />
        )}
        <Icon className="size-5 flex-none transition-transform duration-200 group-hover:scale-110" />
        {expanded && <span className="flex-1 whitespace-nowrap">{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {expanded && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[45] hidden md:block"
          onClick={() => setSidebarExpanded(false)}
        />
      )}
      <aside
        aria-label="Sidebar"
        className={`fixed bottom-0 left-0 hidden flex-col overflow-hidden border-r border-slate-200/80 bg-white/75 p-3 backdrop-blur-xl transition-[width] duration-300 ease-out dark:border-white/10 dark:bg-slate-900/70 md:flex ${
          offsetTop ? "top-16" : "top-0 pt-5"
        } ${expanded ? "z-50 w-60 shadow-2xl" : "z-30 w-[4.5rem]"}`}
      >
        {!offsetTop && (
          <div
            className={`mb-3 flex h-10 items-center ${expanded ? "gap-2.5 px-2" : "justify-center"}`}
          >
            <BrandLogo className="size-9" />
            {expanded && <span className="text-xl font-bold tracking-tight">NoteMe</span>}
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={expanded ? "Perkecil sidebar" : "Perbesar sidebar"}
          title={expanded ? undefined : "Perbesar sidebar"}
          className={`press-sm mb-2 flex h-11 items-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground ${
            expanded ? "gap-3 px-3.5 text-sm font-semibold" : "justify-center"
          }`}
        >
          {expanded ? (
            <PanelLeftClose className="size-5 flex-none" />
          ) : (
            <PanelLeftOpen className="size-5 flex-none" />
          )}
          {expanded && <span className="whitespace-nowrap">Perkecil sidebar</span>}
        </button>

        <nav className="flex flex-col gap-1.5">{mainItems.map(renderItem)}</nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-200/80 pt-3 dark:border-white/10">
          {bottomItems.map(renderItem)}
        </div>
      </aside>
    </>
  );
}
