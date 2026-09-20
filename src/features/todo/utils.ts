import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/** Warna kolom (header + bar progres), dipakai bergilir sesuai urutan section. */
export const SECTION_COLORS = ["#3b82f6", "#f97316", "#eab308", "#22c55e", "#a855f7"] as const;

export function sectionColor(index: number): string {
  return SECTION_COLORS[index % SECTION_COLORS.length]!;
}

export type DeadlineInfo = { text: string; overdue: boolean; soon: boolean };

export function deadlineLabel(deadline: string | null): DeadlineInfo | null {
  if (!deadline) return null;
  const hasTime = deadline.includes("T");
  const date = new Date(hasTime ? deadline : `${deadline}T00:00:00`);
  const today = startOfDay(new Date());
  const timeSuffix = hasTime ? `, ${format(date, "HH:mm")}` : "";
  if (isToday(date)) return { text: `Hari ini${timeSuffix}`, overdue: false, soon: true };
  if (isTomorrow(date)) return { text: `Besok${timeSuffix}`, overdue: false, soon: true };
  const overdue = isBefore(date, hasTime ? new Date() : today);
  const pattern = date.getFullYear() === today.getFullYear() ? "d MMM" : "d MMM yyyy";
  return {
    text: `${format(date, pattern, { locale: idLocale })}${timeSuffix}`,
    overdue,
    soon: false,
  };
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

export function deadlineTime(deadline: string | null): number {
  if (!deadline) return Number.POSITIVE_INFINITY;
  return new Date(deadline.includes("T") ? deadline : `${deadline}T00:00:00`).getTime();
}
