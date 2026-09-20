import { CalendarDays, X } from "lucide-react";
import { deleteTask, setTaskProgress, taskProgress, type TodoTask } from "@/lib/noteme/todoStore";
import { deadlineLabel } from "../utils";

export function TaskCard({
  task,
  color,
  editMode,
  onOpen,
}: {
  task: TodoTask;
  color: string;
  editMode: boolean;
  onOpen: (task: TodoTask) => void;
}) {
  const progress = taskProgress(task);
  const deadline = deadlineLabel(task.deadline);
  const overdue = !!deadline?.overdue && progress < 100;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className="press-sm relative cursor-pointer rounded-2xl border border-black/5 bg-card p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-shadow hover:shadow-[0_6px_18px_rgba(15,23,42,0.1)] focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-white/10"
    >
      {editMode && (
        <button
          type="button"
          aria-label="Hapus task"
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(task.id);
          }}
          className="press-sm absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow"
        >
          <X className="size-3.5" />
        </button>
      )}

      <p
        className={`text-[15px] font-semibold leading-snug ${
          progress >= 100 ? "text-muted-foreground line-through decoration-1" : ""
        }`}
      >
        {task.title}
      </p>
      {task.description.trim() && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
      )}

      {deadline && (
        <span
          className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[13px] ${
            overdue ? "bg-destructive/12 font-medium text-destructive" : "text-muted-foreground"
          }`}
          style={
            !overdue && deadline.soon && progress < 100
              ? { backgroundColor: `${color}26`, color }
              : undefined
          }
        >
          <CalendarDays className="size-3.5" />
          {deadline.text}
        </span>
      )}

      <div className="mt-2 flex items-center justify-between text-sm">
        <span>Progress</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      {/* Bar progres + slider tak terlihat di atasnya: geser langsung di kartu untuk ubah progres. */}
      <div className="relative mt-1.5 h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          aria-label={`Progress ${task.title}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => setTaskProgress(task.id, Number(e.target.value))}
          className="absolute -inset-y-2 inset-x-0 h-6 w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
