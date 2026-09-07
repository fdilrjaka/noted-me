import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import { createTask, toggleTaskCompleted, type TodoTask } from "@/lib/noteme/todoStore";
import { deadlineLabel, formatDetectedBadge } from "../utils";

export function SectionColumn({
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
