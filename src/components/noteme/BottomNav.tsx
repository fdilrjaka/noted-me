import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Trash2, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/auth", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t px-2 pt-2 md:hidden"
      aria-label="Navigasi utama"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`press-sm flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className={`size-5 ${active ? "text-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
