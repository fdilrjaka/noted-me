export const SCHEDULE_DAYS = [
  { id: "senin", label: "Senin" },
  { id: "selasa", label: "Selasa" },
  { id: "rabu", label: "Rabu" },
  { id: "kamis", label: "Kamis" },
  { id: "jumat", label: "Jumat" },
  { id: "lainnya", label: "Lainnya" },
] as const;

export type ScheduleDayId = (typeof SCHEDULE_DAYS)[number]["id"];

export function DayTabs({
  active,
  onChange,
}: {
  active: ScheduleDayId;
  onChange: (day: ScheduleDayId) => void;
}) {
  return (
    <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1">
      {SCHEDULE_DAYS.map((day) => (
        <button
          key={day.id}
          onClick={() => onChange(day.id)}
          aria-current={active === day.id ? "true" : undefined}
          className={`press-sm flex-none rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === day.id
              ? "bg-primary text-primary-foreground"
              : "glass-input text-muted-foreground"
          }`}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
