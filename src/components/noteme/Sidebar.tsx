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
                className={`press-sm group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "border border-primary/25 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(67,199,175,0.14),0_0_18px_rgba(67,199,175,0.18)]"
                    : "border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_0_0_1px_rgba(67,199,175,0.12),0_0_18px_rgba(67,199,175,0.16)] hover:translate-x-0.5"
                }`}
              >
                <Icon className="size-4.5 transition-transform duration-200 group-hover:scale-110" />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  className={`size-4 flex-none transition-all duration-200 ${
                    active ? "opacity-60" : "opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-border/60 pt-3">
          <Link
            to="/trash"
            className={`press-sm group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              pathname === "/trash"
                ? "border border-primary/25 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(67,199,175,0.14),0_0_18px_rgba(67,199,175,0.18)]"
                : "border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_0_0_1px_rgba(67,199,175,0.12),0_0_18px_rgba(67,199,175,0.16)]"
            }`}
          >
            <Trash2 className="size-4.5 transition-transform duration-200 group-hover:scale-110" />
            Trash
          </Link>
          <Link
            to="/auth"
            className={`press-sm group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              pathname === "/auth"
                ? "border border-primary/25 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(67,199,175,0.14),0_0_18px_rgba(67,199,175,0.18)]"
                : "border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_0_0_1px_rgba(67,199,175,0.12),0_0_18px_rgba(67,199,175,0.16)]"
            }`}
          >
            <User className="size-4.5 transition-transform duration-200 group-hover:scale-110" />
            Profile
          </Link>
        </div>
      </div>
    </aside>
  );
}
