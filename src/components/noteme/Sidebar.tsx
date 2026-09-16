import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, ChevronRight, NotebookText, Trash2, User } from "lucide-react";
import { BrandMark } from "@/components/noteme/BrandMark";

const items = [
  { to: "/", label: "Notes", icon: NotebookText },
  { to: "/todo", label: "To Do List", icon: CheckSquare },
  { to: "/schedule", label: "Jadwal", icon: CalendarDays },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col justify-between p-4 safe-top safe-bottom md:flex">
      <div className="glass-navigation flex h-full flex-col rounded-3xl p-3">
        <div className="px-3 py-3">
          <BrandMark className="text-xl" />
        </div>

        <nav className="mt-4 flex flex-col gap-1.5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`press-sm flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#80e5d4]/70 text-slate-800 shadow-sm border border-white/60"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Icon className="size-4.5" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="size-4 flex-none opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-200/50 pt-3">
          <Link
            to="/trash"
            className={`press-sm flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              pathname === "/trash"
                ? "bg-[#80e5d4]/70 text-slate-800 shadow-sm border border-white/60"
                : "text-slate-600 hover:bg-white/40"
            }`}
          >
            <Trash2 className="size-4.5" />
            Trash
          </Link>
          <Link
            to="/auth"
            className={`press-sm flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
              pathname === "/auth"
                ? "bg-[#80e5d4]/70 text-slate-800 shadow-sm border border-white/60"
                : "text-slate-600 hover:bg-white/40"
            }`}
          >
            <User className="size-4.5" />
            Profile
          </Link>
        </div>
      </div>
    </aside>
  );
}
