import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, NotebookText, Trash2, User } from "lucide-react";
import { BrandMark } from "@/components/noteme/BrandMark";

const items = [
  { to: "/", label: "Notes", icon: NotebookText },
  { to: "/todo", label: "To Do List", icon: CheckSquare },
  { to: "/schedule", label: "Jadwal", icon: CalendarDays },
] as const;

/** Sidebar persisten desktop (md+). Di HP, navigasi tetap lewat BottomNav. */
export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col justify-between p-4 safe-top safe-bottom md:flex">
      <div className="glass-navigation flex h-full flex-col rounded-3xl p-3">
        <div className="px-2 py-3">
          <BrandMark className="text-lg" />
        </div>

        <nav className="mt-2 flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`press-sm flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-input"
                }`}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
          <Link
            to="/trash"
            className={`press-sm flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === "/trash" ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-input"
            }`}
          >
            <Trash2 className="size-4.5" />
            Trash
          </Link>
          <Link
            to="/auth"
            className={`press-sm flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === "/auth" ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-input"
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
