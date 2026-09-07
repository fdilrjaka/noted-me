import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const CATEGORY_COLORS: Record<string, string> = {
  project: "#8b5cf6",
  "tugas-kuliah": "#38bdf8",
  organisasi: "#f97316",
  pribadi: "#22c55e",
  lainnya: "#f43f5e",
};

export function deadlineLabel(deadline: string | null): { text: string; overdue: boolean } | null {
  if (!deadline) return null;
  const hasTime = deadline.includes("T");
  const date = new Date(hasTime ? deadline : `${deadline}T00:00:00`);
  const today = startOfDay(new Date());
  const timeSuffix = hasTime ? `, ${format(date, "HH:mm")}` : "";
  if (isToday(date)) return { text: `Hari ini${timeSuffix}`, overdue: false };
  if (isTomorrow(date)) return { text: `Besok${timeSuffix}`, overdue: false };
  const overdue = isBefore(date, hasTime ? new Date() : today);
  return { text: `${format(date, "d MMM", { locale: idLocale })}${timeSuffix}`, overdue };
}

export function formatDetectedBadge(date: string, time: string): string {
  const d = new Date(`${date}T00:00:00`);
  const dayLabel = isToday(d)
    ? "Hari ini"
    : isTomorrow(d)
      ? "Besok"
      : format(d, "d MMM", { locale: idLocale });
  return time ? `${dayLabel}, ${time}` : dayLabel;
}
