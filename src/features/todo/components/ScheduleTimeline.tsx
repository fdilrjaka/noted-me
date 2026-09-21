import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { taskProgress, type TodoTask } from "@/lib/noteme/todoStore";
import { TaskCard } from "./TaskCard";

export type TimelineItem = { task: TodoTask; color: string; label: string };

type Group = {
  key: string;
  title: string;
  order: number;
  tone: "overdue" | "today" | "normal";
  items: TimelineItem[];
};

function toDate(deadline: string) {
  return new Date(deadline.includes("T") ? deadline : `${deadline}T00:00:00`);
}

function groupItems(items: TimelineItem[]): Group[] {
  const groups = new Map<string, Group>();
  const today = startOfDay(new Date());
  for (const item of items) {
    const dl = item.task.deadline;
    let key: string;
    let title: string;
    let order: number;
    let tone: Group["tone"] = "normal";
    if (!dl) {
      key = "none";
      title = "Tanpa deadline";
      order = Number.POSITIVE_INFINITY;
    } else {
      const date = toDate(dl);
      const day = startOfDay(date);
      if (taskProgress(item.task) < 100 && isBefore(day, today)) {
        key = "overdue";
        title = "Terlambat";
        order = Number.NEGATIVE_INFINITY;
        tone = "overdue";
      } else {
        key = format(day, "yyyy-MM-dd");
        order = day.getTime();
        title = isToday(day)
          ? "Hari ini"
          : isTomorrow(day)
            ? "Besok"
            : format(day, "EEEE, d MMM yyyy", { locale: idLocale });
        if (isToday(day)) tone = "today";
      }
    }
    const g = groups.get(key) ?? { key, title, order, tone, items: [] };
    g.items.push(item);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => a.order - b.order);
  for (const g of list) {
    g.items.sort(
      (a, b) =>
        (a.task.deadline ? toDate(a.task.deadline).getTime() : 0) -
        (b.task.deadline ? toDate(b.task.deadline).getTime() : 0),
    );
  }
  return list;
}

/** Tampilan "Schedule & Deadlines": task diurutkan per hari dalam bentuk timeline. */
export function ScheduleTimeline({
  items,
  editMode,
  onOpen,
}: {
  items: TimelineItem[];
  editMode: boolean;
  onOpen: (task: TodoTask) => void;
}) {
  const groups = groupItems(items);
  if (groups.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">Belum ada task yang cocok.</p>
    );
  }
  return (
    <ol className="ml-2 max-w-4xl border-l-2 border-slate-200 dark:border-white/15">
      {groups.map((g) => (
        <li key={g.key} className="relative pb-7 pl-6">
          <span
            aria-hidden="true"
            className={`absolute -left-[9px] top-1 size-4 rounded-full border-[3px] border-background ${
              g.tone === "overdue"
                ? "bg-destructive"
                : g.tone === "today"
                  ? "bg-primary"
                  : "bg-slate-400"
            }`}
          />
          <h3
            className={`mb-2.5 text-base font-semibold ${g.tone === "overdue" ? "text-destructive" : ""}`}
          >
            {g.title}{" "}
            <span className="text-sm font-normal text-muted-foreground">· {g.items.length}</span>
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {g.items.map(({ task, color, label }) => (
              <TaskCard
                key={task.id}
                task={task}
                color={color}
                editMode={editMode}
                label={label}
                onOpen={onOpen}
              />
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
