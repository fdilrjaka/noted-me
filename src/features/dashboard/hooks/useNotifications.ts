import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ScheduleDayId } from "@/components/schedule/DayTabs";
import { useNotifPrefs } from "@/lib/noteme/notifPrefs";
import { useScheduleData } from "@/lib/noteme/scheduleStore";
import { useTodoData } from "@/lib/noteme/todoStore";

export type DashboardNotif = {
  id: string;
  title: string;
  subtitle: string;
  overdue: boolean;
  onClick: () => void;
};

/**
 * Kumpulan notifikasi dashboard: deadline todo yang deket/terlewat + kelas hari
 * ini. Dipisah dari Dashboard karena ini murni derivasi data (todo + jadwal +
 * preferensi notifikasi), gak nyambung ke render.
 */
export function useNotifications(): DashboardNotif[] {
  const navigate = useNavigate();
  const todoData = useTodoData();
  const scheduleData = useScheduleData();
  const notifPrefs = useNotifPrefs();

  return useMemo(() => {
    const now = new Date();
    const soonCutoff = new Date(now);
    soonCutoff.setDate(soonCutoff.getDate() + 2);
    soonCutoff.setHours(23, 59, 59, 999);

    const items: DashboardNotif[] = [];

    if (notifPrefs.todoReminders) {
      todoData.tasks
        .filter((t) => !t.deleted && !t.completed && t.deadline)
        .forEach((t) => {
          const due = new Date(t.deadline as string);
          if (Number.isNaN(due.getTime()) || due > soonCutoff) return;
          const overdue = due < now;
          items.push({
            id: `todo-${t.id}`,
            title: t.title || "Tugas tanpa judul",
            subtitle: overdue
              ? `Terlewat • ${due.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`
              : `Tenggat • ${due.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`,
            overdue,
            onClick: () => void navigate({ to: "/todo" }),
          });
        });
    }

    const jsDayToId: Record<number, ScheduleDayId | undefined> = {
      1: "senin",
      2: "selasa",
      3: "rabu",
      4: "kamis",
      5: "jumat",
    };
    const todayId = jsDayToId[now.getDay()];
    if (todayId && notifPrefs.scheduleReminders) {
      scheduleData.classes
        .filter((c) => !c.deleted && c.day === todayId && c.status !== "done")
        .forEach((c) => {
          items.push({
            id: `schedule-${c.id}`,
            title: c.courseName || "Kelas",
            subtitle: `Hari ini • ${c.time}`,
            overdue: false,
            onClick: () => void navigate({ to: "/schedule" }),
          });
        });
    }

    items.sort((a, b) => Number(b.overdue) - Number(a.overdue));
    return items;
  }, [todoData, scheduleData, notifPrefs, navigate]);
}
