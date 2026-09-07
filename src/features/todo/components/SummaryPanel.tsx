import { useMemo } from "react";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, ChevronDown, Eye, PieChart, Sparkles } from "lucide-react";
import { TODO_CATEGORIES, type TodoData } from "@/lib/noteme/todoStore";
import { CATEGORY_COLORS, deadlineLabel } from "../utils";

export function SummaryPanel({ data }: { data: TodoData }) {
  const today = startOfDay(new Date());

  // Semua task aktif lintas section untuk ringkasan global.
  const allTasks = useMemo(() => data.tasks.filter((t) => !t.deleted), [data.tasks]);

  const todayTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.deadline &&
          isToday(new Date(t.deadline.includes("T") ? t.deadline : `${t.deadline}T00:00:00`)),
      ),
    [allTasks],
  );
  const todayDone = todayTasks.filter((t) => t.completed).length;
  const todayPct = todayTasks.length
    ? Math.round((todayDone / todayTasks.length) * 100)
    : allTasks.length
      ? Math.round((allTasks.filter((t) => t.completed).length / allTasks.length) * 100)
      : 0;

  // Deadline {date, hasTime} untuk semua task punya-deadline.
  const withDeadlines = useMemo(
    () =>
      allTasks
        .filter((t) => t.deadline)
        .map((t) => {
          const dl = t.deadline!;
          const hasTime = dl.includes("T");
          return { t, date: new Date(hasTime ? dl : `${dl}T00:00:00`), hasTime };
        }),
    [allTasks],
  );

  // Upcoming: belum selesai, belum terlewat (termasuk hari ini).
  const upcoming = useMemo(() => {
    return withDeadlines
      .filter(
        ({ t, date, hasTime }) =>
          !t.completed && (!isBefore(date, hasTime ? new Date() : today) || isToday(date)),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [withDeadlines, today]);

  // Priority Focus: task terlewat yang belum selesai.
  const overdue = useMemo(() => {
    return withDeadlines
      .filter(
        ({ t, date, hasTime }) =>
          !t.completed && isBefore(date, hasTime ? new Date() : today) && !isToday(date),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [withDeadlines, today]);

  const ringPct = todayPct;
  const ringColor =
    todayPct >= 75 ? "text-primary" : todayPct >= 40 ? "text-primary" : "text-muted-foreground";

  // Distribusi task (belum selesai) per kategori, buat pie chart.
  const categoryBreakdown = useMemo(() => {
    return TODO_CATEGORIES.map((c) => {
      const sectionIds = new Set(
        data.sections.filter((s) => s.category_id === c.id && !s.deleted).map((s) => s.id),
      );
      const count = allTasks.filter((t) => sectionIds.has(t.section_id)).length;
      return { ...c, count, color: CATEGORY_COLORS[c.id] ?? "#94a3b8" };
    }).filter((c) => c.count > 0);
  }, [allTasks, data.sections]);

  const totalForPie = categoryBreakdown.reduce((n, c) => n + c.count, 0);
  const pieGradient = useMemo(() => {
    if (totalForPie === 0) return null;
    let acc = 0;
    const stops = categoryBreakdown.map((c) => {
      const start = (acc / totalForPie) * 360;
      acc += c.count;
      const end = (acc / totalForPie) * 360;
      return `${c.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [categoryBreakdown, totalForPie]);

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-80 flex-col p-4 safe-top safe-bottom xl:flex">
      <div className="glass-navigation flex h-full min-h-0 flex-col overflow-hidden rounded-3xl">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h1 className="px-1 pb-3 pt-1 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Progress Dashboard
          </h1>

          <div className="flex flex-col gap-3">
            {/* Today's Progress */}
            <section className="rounded-2xl border border-border/60 p-3.5">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ChevronDown className="size-3.5" /> Today's Progress
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative size-16 flex-none">
                  <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-input"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className={ringColor}
                      strokeDasharray={`${(ringPct / 100) * 97.4} 97.4`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold leading-none">{todayPct}%</span>
                  </span>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold leading-snug">
                    {todayTasks.length
                      ? `${todayDone}/${todayTasks.length} hari ini`
                      : "Tanpa deadline hari ini"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                <span className="glass-input rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  {allTasks.filter((t) => t.completed).length}/{allTasks.length} task
                </span>
              </div>
            </section>

            {/* Upcoming Deadlines */}
            <section className="rounded-2xl border border-border/60 p-3.5">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Calendar className="size-3.5" /> Upcoming Deadlines
              </h2>
              {upcoming.length === 0 ? (
                <div className="mt-3 flex flex-col items-center gap-1 py-1 text-center">
                  <Sparkles className="size-6 text-primary/70" />
                  <p className="text-base font-bold leading-tight">
                    Waktunya Menikmati
                    <br />
                    Ketenangan
                  </p>
                </div>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {upcoming.map(({ t }) => {
                    const lbl = deadlineLabel(t.deadline)!;
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 break-words text-sm">{t.title}</span>
                        <span className="flex-none text-xs text-muted-foreground">{lbl.text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Priority Focus */}
            <section className="rounded-2xl border border-border/60 p-3.5">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Eye className="size-3.5" /> Priority Focus
              </h2>
              {overdue.length === 0 ? (
                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-base font-bold">Clear Horizon</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Fokus Prioritas: Tidak ada tugas yang terlewat, Anda mengontrol segalanya.
                  </p>
                </div>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {overdue.map(({ t }) => {
                    const lbl = deadlineLabel(t.deadline)!;
                    return (
                      <li
                        key={t.id}
                        className="flex flex-col gap-0.5 rounded-lg bg-destructive/10 px-2 py-1.5"
                      >
                        <span className="break-words text-sm font-medium text-destructive">
                          {t.title}
                        </span>
                        <span className="text-xs text-destructive">{lbl.text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Distribusi Kategori — pie chart */}
            <section className="rounded-2xl border border-border/60 p-3.5">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <PieChart className="size-3.5" /> Distribusi Kategori
              </h2>
              <div className="mt-3 flex justify-center">
                <div
                  className="relative flex size-40 flex-none items-center justify-center rounded-full"
                  style={{
                    background:
                      pieGradient ?? "conic-gradient(hsl(var(--primary) / 0.5) 0deg 360deg)",
                  }}
                >
                  <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-card px-3 text-center">
                    {totalForPie === 0 ? (
                      <>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Mulai aktivitas Anda untuk melihat visualisasi distribusi tugas Anda di
                          sini.
                        </p>
                        <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/70">
                          Data Belum Tersedia
                        </p>
                      </>
                    ) : (
                      <span className="text-xl font-bold">{totalForPie}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
                {totalForPie === 0 ? (
                  <>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2.5 rounded-full bg-primary" /> Kategori: 0
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      Belum kategori: <span className="size-2.5 rounded-full bg-[#a855f7]" />
                    </span>
                  </>
                ) : (
                  categoryBreakdown.map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.label}: <span className="font-medium text-foreground">{c.count}</span>
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="flex-none border-t border-border/60 py-3 text-center text-xs text-muted-foreground">
          {format(new Date(), "d MMMM yyyy", { locale: idLocale })}
        </div>
      </div>
    </aside>
  );
}
