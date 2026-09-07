import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Plus } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import {
  TODO_CATEGORIES,
  categorySections,
  createSection,
  deleteSection,
  loadTodoLocal,
  patchSection,
  sectionTasks,
  useTodoData,
  type TodoTask,
} from "@/lib/noteme/todoStore";
import { SectionColumn } from "./components/SectionColumn";
import { SummaryPanel } from "./components/SummaryPanel";
import { TaskEditDialog } from "./components/TaskEditDialog";

export function TodoPage() {
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

      {editingTask && <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} />}

      <BottomNav />
    </main>
  );
}
