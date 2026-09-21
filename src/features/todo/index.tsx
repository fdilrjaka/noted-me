import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import {
  TODO_CATEGORIES,
  categorySections,
  createSection,
  deleteCompletedTasks,
  deleteSection,
  loadTodoLocal,
  patchSection,
  taskProgress,
  useTodoData,
  type TodoTask,
} from "@/lib/noteme/todoStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { QuickAddTarget } from "./components/QuickAddPopover";
import { ScheduleTimeline } from "./components/ScheduleTimeline";
import { SectionColumn } from "./components/SectionColumn";
import { TaskEditDialog } from "./components/TaskEditDialog";
import {
  TodoToolbar,
  type TagCount,
  type TodoFilter,
  type TodoSort,
  type TodoStats,
  type TodoView,
} from "./components/TodoToolbar";
import { useTodoOwner } from "./hooks/useTodoOwner";
import { deadlineLabel, deadlineTime, sectionColor } from "./utils";

function isOverdue(t: TodoTask) {
  return taskProgress(t) < 100 && !!deadlineLabel(t.deadline)?.overdue;
}

export function TodoPage() {
  const data = useTodoData();
  const owner = useTodoOwner();
  const [category, setCategory] = useState<string>(TODO_CATEGORIES[0].id);
  const [view, setView] = useState<TodoView>("board");
  const [editMode, setEditMode] = useState(false);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [sort, setSort] = useState<TodoSort>("manual");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [addingIn, setAddingIn] = useState<string | null>(null);
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
  const inGridView = view === "board" || view === "list";

  // Semua section aktif + task aktif lintas kategori (untuk tampilan proyek & jadwal).
  const sectionById = useMemo(
    () => new Map(data.sections.filter((s) => !s.deleted).map((s) => [s.id, s])),
    [data.sections],
  );
  const activeTasks = useMemo(
    () => data.tasks.filter((t) => !t.deleted && sectionById.has(t.section_id)),
    [data.tasks, sectionById],
  );

  // Task yang jadi cakupan tampilan sekarang (sebelum filter/cari) → statistik, tag, hapus selesai.
  const scopeSections = inGridView ? sections : [...sectionById.values()];
  const scopeTasks = useMemo(() => {
    if (!inGridView) return activeTasks;
    const ids = new Set(sections.map((s) => s.id));
    return activeTasks.filter((t) => ids.has(t.section_id));
  }, [activeTasks, inGridView, sections]);

  const stats: TodoStats = useMemo(() => {
    const total = scopeTasks.length;
    const done = scopeTasks.filter((t) => taskProgress(t) >= 100).length;
    const overdue = scopeTasks.filter(isOverdue).length;
    const avgProgress = total
      ? Math.round(scopeTasks.reduce((n, t) => n + taskProgress(t), 0) / total)
      : 0;
    return { total, done, overdue, avgProgress };
  }, [scopeTasks]);

  const tags: TagCount[] = useMemo(() => {
    const map = new Map<string, TagCount>();
    for (const t of scopeTasks) {
      for (const tag of t.tags) {
        const key = tag.toLowerCase();
        const cur = map.get(key);
        if (cur) cur.count += 1;
        else map.set(key, { tag, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [scopeTasks]);

  // Tag yang sudah tidak dipakai task manapun jangan ikut memfilter.
  const activeTagFilter = tagFilter.filter((k) => tags.some((t) => t.tag.toLowerCase() === k));

  const applyView = (list: TodoTask[]) => {
    const q = query.trim().toLowerCase();
    const out = list.filter((t) => {
      if (q && !`${t.title} ${t.description} ${t.tags.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      if (
        activeTagFilter.length &&
        !t.tags.some((g) => activeTagFilter.includes(g.toLowerCase()))
      ) {
        return false;
      }
      if (filter === "active") return taskProgress(t) < 100;
      if (filter === "done") return taskProgress(t) >= 100;
      if (filter === "overdue") return isOverdue(t);
      return true;
    });
    const sectionPos = (t: TodoTask) => sectionById.get(t.section_id)?.position ?? 0;
    if (sort === "deadline") {
      return out.sort((a, b) => deadlineTime(a.deadline) - deadlineTime(b.deadline));
    }
    if (sort === "progress") {
      return out.sort((a, b) => taskProgress(b) - taskProgress(a) || a.position - b.position);
    }
    if (sort === "tag") {
      const key = (t: TodoTask) => (t.tags[0] ?? "\uffff").toLowerCase();
      return out.sort((a, b) => key(a).localeCompare(key(b)) || a.position - b.position);
    }
    return out.sort((a, b) => sectionPos(a) - sectionPos(b) || a.position - b.position);
  };

  const visibleTasks = (sectionId: string) =>
    applyView(scopeTasks.filter((t) => t.section_id === sectionId));

  const quickAddTargets: QuickAddTarget[] = useMemo(
    () =>
      TODO_CATEGORIES.flatMap((c) => {
        const secs = categorySections(data, c.id);
        return secs.length
          ? secs.map((s) => ({ value: s.id, label: `${c.label} · ${s.name}` }))
          : [{ value: `new:${c.id}`, label: `${c.label} · To Do (baru)` }];
      }),
    [data],
  );
  const quickAddDefault = sections[0]?.id ?? `new:${category}`;

  const submitSection = () => {
    if (sectionName.trim()) createSection(category, sectionName);
    setSectionName("");
    setAddingSection(false);
  };

  const onHeaderAddTask = () => {
    if (!inGridView) setView("board");
    if (sections.length === 0) {
      setAddingIn(createSection(category, "To Do"));
      return;
    }
    setAddingIn(sections[0]!.id);
  };

  const onClearDone = () => {
    if (stats.done === 0) return;
    const where = inGridView ? "di kategori ini" : "di semua kategori";
    if (window.confirm(`Hapus ${stats.done} task yang sudah selesai ${where}?`)) {
      deleteCompletedTasks(scopeSections.map((s) => s.id));
    }
  };

  const onReset = () => {
    setFilter("all");
    setSort("manual");
    setQuery("");
    setTagFilter([]);
  };

  const onToggleTag = (tag: string) => {
    const key = tag.toLowerCase();
    setTagFilter((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  };

  const viewHint =
    view === "project"
      ? "Tampilan proyek — dikelompokkan per kategori"
      : view === "schedule"
        ? "Jadwal & deadline — urut per tanggal"
        : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[100rem] px-4 safe-top safe-bottom-lg text-foreground md:pl-[5.5rem]">
      <Sidebar />
      {/* Search bar — sama seperti halaman Jadwal */}
      <div className="pb-2 pt-4">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Search..."
            aria-label="Cari task"
            className="glass-soft w-full rounded-full py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="pb-52 pt-3 md:pb-40">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">to-do list</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <SyncStatus />
                {viewHint && <span className="text-xs text-muted-foreground">{viewHint}</span>}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={onHeaderAddTask}
                className="press-sm flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[15px] font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Plus className="size-5" /> Add task
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menu lainnya"
                    className="press-sm flex size-11 items-center justify-center rounded-xl border border-slate-300/70 bg-white/60 dark:border-white/15 dark:bg-white/5"
                  >
                    <MoreHorizontal className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onSelect={() => setAddingSection(true)}>
                    <Plus className="size-4" /> Tambah section
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onReset}>Reset filter & urutan</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {inGridView && (
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {TODO_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`press-sm flex-none rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/[0.05] text-muted-foreground hover:bg-black/10 dark:bg-white/10"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {view === "schedule" && (
            <div className="mt-6">
              <ScheduleTimeline
                items={applyView(activeTasks).map((task) => {
                  const sec = sectionById.get(task.section_id)!;
                  const ci = Math.max(
                    0,
                    TODO_CATEGORIES.findIndex((c) => c.id === sec.category_id),
                  );
                  return {
                    task,
                    color: sectionColor(ci),
                    label: `${TODO_CATEGORIES[ci]!.label} · ${sec.name}`,
                  };
                })}
                editMode={editMode}
                onOpen={setEditingTask}
              />
            </div>
          )}

          {view === "project" && (
            <div className="-mx-4 mt-5 flex items-start gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              {TODO_CATEGORIES.map((c, i) => {
                const secs = categorySections(data, c.id);
                const ids = new Set(secs.map((s) => s.id));
                return (
                  <SectionColumn
                    key={c.id}
                    sectionId={secs[0]?.id ?? null}
                    ensureSectionId={() => createSection(c.id, "To Do")}
                    showMenu={false}
                    taskLabel={
                      secs.length > 1 ? (t) => sectionById.get(t.section_id)?.name : undefined
                    }
                    name={c.label}
                    color={sectionColor(i)}
                    owner={owner}
                    tasks={applyView(activeTasks.filter((t) => ids.has(t.section_id)))}
                    wide={false}
                    editMode={editMode}
                    adding={addingIn === `cat:${c.id}`}
                    onAddingChange={(open) => setAddingIn(open ? `cat:${c.id}` : null)}
                    onRename={() => {}}
                    onDelete={() => {}}
                    onEditTask={setEditingTask}
                  />
                );
              })}
            </div>
          )}

          {inGridView && (
            <div
              className={`-mx-4 mt-5 px-4 pb-2 md:mx-0 md:px-0 ${
                view === "board"
                  ? "flex items-start gap-4 overflow-x-auto"
                  : "flex flex-col items-start gap-4"
              }`}
            >
              {sections.map((section, i) => (
                <SectionColumn
                  key={section.id}
                  sectionId={section.id}
                  name={section.name}
                  color={sectionColor(i)}
                  owner={owner}
                  tasks={visibleTasks(section.id)}
                  wide={view === "list"}
                  editMode={editMode}
                  adding={addingIn === section.id}
                  onAddingChange={(open) => setAddingIn(open ? section.id : null)}
                  onRename={(name) => patchSection(section.id, { name })}
                  onDelete={() => deleteSection(section.id)}
                  onEditTask={setEditingTask}
                />
              ))}

              <div
                className={`flex-none ${view === "list" ? "w-full max-w-3xl" : "w-[17.5rem] sm:w-72"}`}
              >
                {addingSection ? (
                  <div className="rounded-2xl border border-black/5 bg-card p-3 shadow-sm dark:border-white/10">
                    <input
                      autoFocus
                      value={sectionName}
                      onChange={(e) => setSectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitSection();
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
                        onClick={submitSection}
                        className="press-sm rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(true)}
                    className="press-sm flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-black/[0.03] dark:border-white/20 dark:hover:bg-white/5"
                  >
                    <Plus className="size-4" /> Add section
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TodoToolbar
        view={view}
        onView={setView}
        editMode={editMode}
        onEditMode={setEditMode}
        filter={filter}
        onFilter={setFilter}
        tags={tags}
        tagFilter={activeTagFilter}
        onToggleTag={onToggleTag}
        sort={sort}
        onSort={setSort}
        stats={stats}
        onClearDone={onClearDone}
        onReset={onReset}
        quickAddTargets={quickAddTargets}
        quickAddDefault={quickAddDefault}
      />

      {editingTask && <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} />}

      <BottomNav />
    </main>
  );
}
