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
        className="press glass-floating relative flex size-10 items-center justify-center rounded-full text-slate-700 active:scale-90"
      >
        <Bell className="size-4" />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-400 ring-2 ring-white" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl p-2 border border-white/80 shadow-xl">
            <p className="px-2 py-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
              Notifikasi
            </p>
            {notifications.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">
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
                    className="press-sm flex items-start gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-white/60"
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
                      <span className="block truncate text-sm font-semibold text-slate-700">{n.title}</span>
                      <span
                        className={`block text-xs ${
                          n.overdue ? "text-red-500" : "text-slate-500"
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
