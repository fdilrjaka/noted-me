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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.85rem)] md:hidden">
      <nav
        className="glass pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-2 shadow-lg"
        aria-label="Navigasi utama"
      >
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`press-sm flex flex-col items-center gap-0.5 rounded-full px-5 py-1.5 text-[11px] ${
                active ? "bg-input text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`size-5 ${active ? "text-primary" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
