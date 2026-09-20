import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
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
import { SectionColumn } from "./components/SectionColumn";
import { TaskEditDialog } from "./components/TaskEditDialog";
import { TodoTopBar } from "./components/TodoTopBar";
import {
  TodoToolbar,
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

  // Semua task aktif di kategori ini (sebelum filter/cari) → untuk statistik & hapus selesai.
  const categoryTasks = useMemo(() => {
    const ids = new Set(sections.map((s) => s.id));
    return data.tasks.filter((t) => !t.deleted && ids.has(t.section_id));
  }, [data.tasks, sections]);

  const stats: TodoStats = useMemo(() => {
    const total = categoryTasks.length;
    const done = categoryTasks.filter((t) => taskProgress(t) >= 100).length;
    const overdue = categoryTasks.filter(isOverdue).length;
    const avgProgress = total
      ? Math.round(categoryTasks.reduce((n, t) => n + taskProgress(t), 0) / total)
      : 0;
    return { total, done, overdue, avgProgress };
  }, [categoryTasks]);

  const visibleTasks = (sectionId: string) => {
    const q = query.trim().toLowerCase();
    const list = categoryTasks.filter((t) => {
      if (t.section_id !== sectionId) return false;
      if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q)) return false;
      if (filter === "active") return taskProgress(t) < 100;
      if (filter === "done") return taskProgress(t) >= 100;
      if (filter === "overdue") return isOverdue(t);
      return true;
    });
    if (sort === "deadline") {
      return list.sort((a, b) => deadlineTime(a.deadline) - deadlineTime(b.deadline));
    }
    if (sort === "progress") {
      return list.sort((a, b) => taskProgress(b) - taskProgress(a) || a.position - b.position);
    }
    return list.sort((a, b) => a.position - b.position);
  };

  const submitSection = () => {
    if (sectionName.trim()) createSection(category, sectionName);
    setSectionName("");
    setAddingSection(false);
  };

  const onHeaderAddTask = () => {
    if (sections.length === 0) {
      setAddingIn(createSection(category, "To Do"));
      return;
    }
    setAddingIn(sections[0]!.id);
  };

  const onClearDone = () => {
    if (stats.done === 0) return;
    if (window.confirm(`Hapus ${stats.done} task yang sudah selesai di kategori ini?`)) {
      deleteCompletedTasks(sections.map((s) => s.id));
    }
  };

  return (
    <main className="min-h-dvh w-full">
      <TodoTopBar query={query} onQuery={setQuery} />
      <Sidebar offsetTop />

      <div className="pt-16 md:pl-[5.5rem]">
        <div className="px-4 pb-52 pt-6 md:px-8 md:pb-40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">to-do list</h1>
              <div className="mt-1">
                <SyncStatus />
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
                  <DropdownMenuItem
                    onSelect={() => {
                      setFilter("all");
                      setSort("manual");
                      setQuery("");
                    }}
                  >
                    Reset filter & urutan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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
        </div>
      </div>

      <TodoToolbar
        view={view}
        onView={setView}
        editMode={editMode}
        onEditMode={setEditMode}
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={setSort}
        stats={stats}
        doneCount={stats.done}
        onClearDone={onClearDone}
      />

      {editingTask && <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} />}

      <BottomNav />
    </main>
  );
}
