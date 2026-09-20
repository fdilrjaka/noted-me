import { Bell, CalendarClock, ListTodo } from "lucide-react";
import type { DashboardNotif } from "../hooks/useNotifications";

export function NotificationPanel(props: {
  notifications: DashboardNotif[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { notifications, open, onToggle, onClose } = props;
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label="Notifikasi"
        className="press relative flex size-9 items-center justify-center rounded-full text-foreground hover:bg-accent/10 active:scale-90"
      >
        <Bell className="size-4" />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-400 ring-2 ring-[var(--card)]" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div className="glass-card spring-in absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl p-2 border border-border shadow-xl">
            <p className="px-2 py-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Notifikasi
            </p>
            {notifications.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Tidak ada tenggat atau jadwal dekat.
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      n.onClick();
                      onClose();
                    }}
                    className="press-sm flex items-start gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-accent/10"
                  >
                    <span
                      className={`mt-0.5 flex size-7 flex-none items-center justify-center rounded-full ${
                        n.id.startsWith("todo-")
                          ? "bg-teal-500/15 text-teal-600"
                          : "bg-blue-500/15 text-blue-600"
                      }`}
                    >
                      {n.id.startsWith("todo-") ? (
                        <ListTodo className="size-3.5" />
                      ) : (
                        <CalendarClock className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {n.title}
                      </span>
                      <span
                        className={`block text-xs ${
                          n.overdue ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        {n.subtitle}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
