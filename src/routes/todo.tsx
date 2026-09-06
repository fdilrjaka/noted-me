import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  PieChart,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";

import {
  TODO_CATEGORIES,
  categorySections,
  createSection,
  createTask,
  deleteSection,
  deleteTask,
  loadTodoLocal,
  patchSection,
  patchTask,
  sectionTasks,
  toggleTaskCompleted,
  useTodoData,
  type TodoData,
  type TodoTask,
} from "@/lib/noteme/todoStore";

export const Route = createFileRoute("/todo")({
  head: () => ({
    meta: [
      { title: "To Do List — NoteMe" },
      { name: "description", content: "Project, tugas kuliah, dan task lain per kategori & section." },
    ],
  }),
  component: TodoPage,
});

function deadlineLabel(deadline: string | null): { text: string; overdue: boolean } | null {
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

function formatDetectedBadge(date: string, time: string): string {
  const d = new Date(`${date}T00:00:00`);
  const today = startOfDay(new Date());
  const dayLabel = isToday(d) ? "Hari ini" : isTomorrow(d) ? "Besok" : format(d, "d MMM", { locale: idLocale });
  return time ? `${dayLabel}, ${time}` : dayLabel;
}

function TodoPage() {
  const data = useTodoData();
  const [category, setCategory] = useState<string>(TODO_CATEGORIES[0].id);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);

  useEffect(() => {
    loadTodoLocal();
    // Halaman ini punya kolom yang bisa di-scroll ke samping; kalau halaman ikut
    // ke-geser, halaman lain (dashboard/sidebar) keliatan "kegeser ke kanan" saat balik.
    window.scrollTo({ left: 0 });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, []);


  const sections = useMemo(() => categorySections(data, category), [data, category]);

  const total = sections.reduce((n, s) => n + sectionTasks(data, s.id).length, 0);
  const done = sections.reduce(
    (n, s) => n + sectionTasks(data, s.id).filter((t) => t.completed).length,
    0,
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[100rem] px-4 safe-top safe-bottom-lg md:pl-[16.5rem] xl:pr-80">
      <Sidebar />
      <header className="flex items-center justify-between gap-3 pb-2 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/explore"
            aria-label="Kembali"
            className="press glass-floating flex size-9 flex-none items-center justify-center rounded-full active:scale-90"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">To Do List</h1>
            <div className="mt-0.5">
              <SyncStatus />
            </div>
          </div>
        </div>
        {total > 0 && (
          <div className="glass-input flex-none rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {done}/{total} selesai
          </div>
        )}
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TODO_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`press-sm flex-none rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              category === c.id
                ? "bg-primary text-primary-foreground"
                : "glass-input text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>



      <div className="mt-4 pb-28">
        <div className="-mx-4 flex min-w-0 snap-x items-start gap-3 overflow-x-auto px-4 pt-3">
          {sections.map((section) => (
            <SectionColumn
              key={section.id}
              sectionId={section.id}
              name={section.name}
              tasks={sectionTasks(data, section.id)}
              onRename={(name) => patchSection(section.id, { name })}
              onDelete={() => deleteSection(section.id)}
              onEditTask={setEditingTask}
            />
          ))}

          <div className="mt-1 w-72 flex-none snap-start">
            {addingSection ? (
              <div className="glass-card rounded-3xl p-3">
                <input
                  autoFocus
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && sectionName.trim()) {
                      createSection(category, sectionName);
                      setSectionName("");
                      setAddingSection(false);
                    }
                    if (e.key === "Escape") setAddingSection(false);
                  }}
                  placeholder="Nama section"
                  className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setAddingSection(false)}
                    className="press-sm rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (sectionName.trim()) createSection(category, sectionName);
                      setSectionName("");
                      setAddingSection(false);
                    }}
                    className="press-sm rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                className="press-sm glass-input flex w-full items-center justify-center gap-1.5 rounded-3xl px-4 py-3 text-sm font-medium text-muted-foreground"
              >
                <Plus className="size-4" /> Add section
              </button>
            )}
          </div>
        </div>
      </div>

      <SummaryPanel data={data} />

      {editingTask && (
        <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} />
      )}

      <BottomNav />
    </main>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  project: "#8b5cf6",
  "tugas-kuliah": "#38bdf8",
  organisasi: "#f97316",
  pribadi: "#22c55e",
  lainnya: "#f43f5e",
};

function SummaryPanel({ data }: { data: TodoData }) {
  const today = startOfDay(new Date());

  // Semua task aktif lintas section untuk ringkasan global.
  const allTasks = useMemo(
    () => data.tasks.filter((t) => !t.deleted),
    [data.tasks],
  );

  const todayTasks = useMemo(
    () => allTasks.filter((t) => t.deadline && isToday(new Date(t.deadline.includes("T") ? t.deadline : `${t.deadline}T00:00:00`))),
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
      .filter(({ t, date, hasTime }) => !t.completed && (!isBefore(date, hasTime ? new Date() : today) || isToday(date)))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [withDeadlines, today]);

  // Priority Focus: task terlewat yang belum selesai.
  const overdue = useMemo(() => {
    return withDeadlines
      .filter(({ t, date, hasTime }) => !t.completed && isBefore(date, hasTime ? new Date() : today) && !isToday(date))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [withDeadlines, today]);

  const ringPct = todayPct;
  const ringColor = todayPct >= 75 ? "text-primary" : todayPct >= 40 ? "text-primary" : "text-muted-foreground";

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
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-input" />
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
                    {todayTasks.length ? `${todayDone}/${todayTasks.length} hari ini` : "Tanpa deadline hari ini"}
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
                      <li key={t.id} className="flex flex-col gap-0.5 rounded-lg bg-destructive/10 px-2 py-1.5">
                        <span className="break-words text-sm font-medium text-destructive">{t.title}</span>
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
                          Mulai aktivitas Anda untuk melihat visualisasi distribusi tugas Anda di sini.
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
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
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

function SectionColumn({
  sectionId,
  name,
  tasks,
  onRename,
  onDelete,
  onEditTask,
}: {
  sectionId: string;
  name: string;
  tasks: TodoTask[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onEditTask: (task: TodoTask) => void;
}) {
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDate("");
    setTaskTime("");
    setAddingTask(false);
  };

  const submitTask = () => {
    if (!taskTitle.trim()) {
      resetTaskForm();
      return;
    }
    const deadline = taskDate ? (taskTime ? `${taskDate}T${taskTime}` : taskDate) : null;
    createTask(sectionId, taskTitle, deadline);
    resetTaskForm();
  };

  return (
    <div className="glass-card mt-1 w-72 flex-none snap-start rounded-3xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft.trim()) onRename(nameDraft);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (nameDraft.trim()) onRename(nameDraft);
                setRenaming(false);
              }
            }}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setNameDraft(name);
              setRenaming(true);
            }}
            className="truncate text-left text-sm font-semibold"
          >
            {name}{" "}
            <span className="text-muted-foreground">
              {tasks.filter((t) => t.completed).length}/{tasks.length}
            </span>
          </button>
        )}
        <button
          onClick={onDelete}
          aria-label="Hapus section"
          className="press-sm flex size-6 flex-none items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Progres section ala Notion: bar tipis yang keisi sesuai task selesai. */}
      <div className="mx-1 mb-2 h-1 overflow-hidden rounded-full bg-input">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${tasks.length ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {tasks.length === 0 && !addingTask && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Belum ada task di sini.</p>
        )}
        {tasks.map((task) => {
          const deadline = deadlineLabel(task.deadline);
          return (
            <div
              key={task.id}
              className="glass-input flex items-start gap-2 rounded-2xl px-3 py-2.5"
            >
              <button
                onClick={() => toggleTaskCompleted(task.id)}
                aria-label={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
                className={`press-sm mt-0.5 flex size-4.5 flex-none items-center justify-center rounded-full border-2 ${
                  task.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {task.completed && <Check className="size-3" />}
              </button>
              <button onClick={() => onEditTask(task)} className="min-w-0 flex-1 text-left">
                <p
                  className={`truncate text-sm ${
                    task.completed ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                {task.description.trim() && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {task.description}
                  </p>
                )}
                {deadline && (
                  <p
                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[11px] ${
                      deadline.overdue && !task.completed
                        ? "bg-destructive/15 text-destructive"
                        : "bg-input text-muted-foreground"
                    }`}
                  >
                    {deadline.text}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>


      {addingTask ? (
        <div className="glass-input mt-1.5 rounded-2xl p-2.5">
          <NaturalDateTitleInput
            autoFocus
            value={taskTitle}
            onChange={setTaskTitle}
            onDetected={({ date, time }) => {
              setTaskDate(date);
              setTaskTime(time);
            }}
            onEnter={submitTask}
            onEscape={resetTaskForm}
            placeholder="Judul task — coba tulis 'besok jam 10.30'"
          />
          {taskDate && (
            <button
              type="button"
              onClick={() => {
                setTaskDate("");
                setTaskTime("");
              }}
              className="press-sm mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              {formatDetectedBadge(taskDate, taskTime)}
              <X className="size-3" />
            </button>
          )}
          <div className="mt-2 flex gap-1.5">
            <input
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="min-w-0 flex-1 rounded-xl bg-input px-2 py-1.5 text-xs outline-none"
            />
            <input
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              disabled={!taskDate}
              className="min-w-0 flex-1 rounded-xl bg-input px-2 py-1.5 text-xs outline-none disabled:opacity-50"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={resetTaskForm}
              className="press-sm rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              Batal
            </button>
            <button
              onClick={submitTask}
              className="press-sm rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Simpan
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingTask(true)}
          className="press-sm mt-1.5 flex w-full items-center gap-1.5 rounded-2xl px-3 py-2 text-sm text-muted-foreground hover:bg-input"
        >
          <Plus className="size-4" /> Add task
        </button>
      )}
    </div>
  );
}

function TaskEditDialog({ task, onClose }: { task: TodoTask; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadlineDate, setDeadlineDate] = useState(task.deadline?.split("T")[0] ?? "");
  const [deadlineTime, setDeadlineTime] = useState(
    task.deadline?.includes("T") ? task.deadline.split("T")[1] : "",
  );
  const save = () => {
    const deadline = deadlineDate ? (deadlineTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate) : null;
    patchTask(task.id, {
      title: title.trim() || task.title,
      description,
      deadline,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={save}>
      <div
        className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <NaturalDateTitleInput
              autoFocus
              value={title}
              onChange={setTitle}
              onDetected={({ date, time }) => {
                setDeadlineDate(date);
                setDeadlineTime(time);
              }}
              className="text-base font-semibold"
            />
          </div>
          <button onClick={save} aria-label="Tutup" className="press-sm mt-0.5 flex-none">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi (opsional)"
          rows={3}
          className="glass-input w-full resize-none rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />

        <label className="mt-3 block text-xs font-medium text-muted-foreground">Deadline</label>
        <div className="mt-1 flex gap-2">
          <input
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className="glass-input min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            type="time"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            disabled={!deadlineDate}
            className="glass-input min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-sm outline-none disabled:opacity-50"
          />
        </div>

        <div className="mt-4 flex justify-between gap-2">
          <button
            onClick={() => {
              deleteTask(task.id);
              onClose();
            }}
            className="press-sm flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-destructive"
          >
            <Trash2 className="size-4" /> Hapus
          </button>
          <button
            onClick={save}
            className="press rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground active:scale-95"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
