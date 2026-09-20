import { useState } from "react";
import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import { createTask, type TodoTask } from "@/lib/noteme/todoStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { TodoOwner } from "../hooks/useTodoOwner";
import { formatDetectedBadge } from "../utils";
import { OwnerAvatar } from "./OwnerAvatar";
import { TaskCard } from "./TaskCard";

export function SectionColumn({
  sectionId,
  name,
  color,
  owner,
  tasks,
  wide,
  editMode,
  adding,
  onAddingChange,
  onRename,
  onDelete,
  onEditTask,
}: {
  sectionId: string;
  name: string;
  color: string;
  owner: TodoOwner;
  tasks: TodoTask[];
  wide: boolean;
  editMode: boolean;
  adding: boolean;
  onAddingChange: (open: boolean) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onEditTask: (task: TodoTask) => void;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDate("");
    setTaskTime("");
    onAddingChange(false);
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

  const commitRename = () => {
    if (nameDraft.trim()) onRename(nameDraft);
    setRenaming(false);
  };

  return (
    <section
      className={`flex-none self-start overflow-hidden rounded-2xl border border-black/5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:border-white/10 ${
        wide ? "w-full max-w-3xl" : "w-[17.5rem] sm:w-72"
      }`}
      style={{ backgroundColor: `${color}1a` }}
    >
      <header className="px-4 pb-3 pt-3 text-white" style={{ backgroundColor: color }}>
        <div className="flex items-center justify-between gap-2">
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="w-full rounded-md bg-white/25 px-2 py-0.5 text-lg font-semibold text-white outline-none placeholder:text-white/70"
            />
          ) : (
            <h2 className="truncate text-lg font-semibold">{name}</h2>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menu section"
                className="press-sm flex size-7 flex-none items-center justify-center rounded-full hover:bg-white/20"
              >
                <MoreVertical className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem
                onSelect={() => {
                  setNameDraft(name);
                  setRenaming(true);
                }}
              >
                <Pencil className="size-4" /> Ganti nama
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAddingChange(true)}>
                <Plus className="size-4" /> Tambah task
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Hapus section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[15px] font-medium">
          <OwnerAvatar owner={owner} className="size-6" />
          <span className="truncate">{owner.name}</span>
        </div>
      </header>

      <div className="flex flex-col gap-2.5 p-2.5">
        {tasks.length === 0 && !adding && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Belum ada task di sini.
          </p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            color={color}
            editMode={editMode}
            onOpen={onEditTask}
          />
        ))}

        {adding ? (
          <div className="rounded-2xl border border-black/5 bg-card p-3 shadow-sm dark:border-white/10">
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
                className="press-sm mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: `${color}26`, color }}
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
                className="min-w-0 flex-1 rounded-xl bg-slate-100 px-2 py-1.5 text-xs outline-none dark:bg-white/10"
              />
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                disabled={!taskDate}
                className="min-w-0 flex-1 rounded-xl bg-slate-100 px-2 py-1.5 text-xs outline-none disabled:opacity-50 dark:bg-white/10"
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
                className="press-sm rounded-full px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                Simpan
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onAddingChange(true)}
            className="press-sm flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[15px] text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Plus className="size-4" /> Add task
          </button>
        )}
      </div>
    </section>
  );
}
