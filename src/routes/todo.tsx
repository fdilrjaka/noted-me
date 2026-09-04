import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Check, ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
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
  const date = new Date(`${deadline}T00:00:00`);
  const today = startOfDay(new Date());
  if (isToday(date)) return { text: "Hari ini", overdue: false };
  if (isTomorrow(date)) return { text: "Besok", overdue: false };
  const overdue = isBefore(date, today);
  return { text: format(date, "d MMM", { locale: idLocale }), overdue };
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
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem]">
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



      <div className="-mx-4 mt-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pb-28">
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

        <div className="w-72 flex-none snap-start">
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

      {editingTask && (
        <TaskEditDialog task={editingTask} onClose={() => setEditingTask(null)} />
      )}

      <BottomNav />
    </main>
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
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const submitTask = () => {
    if (taskTitle.trim()) createTask(sectionId, taskTitle);
    setTaskTitle("");
    setAddingTask(false);
  };

  return (
    <div className="glass-card w-72 flex-none snap-start rounded-3xl p-3">
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
        <div className="mt-1.5">
          <input
            autoFocus
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitTask();
              if (e.key === "Escape") setAddingTask(false);
            }}
            onBlur={submitTask}
            placeholder="Judul task"
            className="glass-input w-full rounded-2xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
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
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const save = () => {
    patchTask(task.id, {
      title: title.trim() || task.title,
      description,
      deadline: deadline || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={save}>
      <div
        className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-base font-semibold outline-none"
          />
          <button onClick={save} aria-label="Tutup" className="press-sm flex-none">
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
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="glass-input mt-1 w-full rounded-2xl px-3 py-2.5 text-sm outline-none"
        />

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
