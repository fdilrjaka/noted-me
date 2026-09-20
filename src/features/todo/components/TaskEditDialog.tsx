import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import { deleteTask, patchTask, taskProgress, type TodoTask } from "@/lib/noteme/todoStore";

export function TaskEditDialog({ task, onClose }: { task: TodoTask; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadlineDate, setDeadlineDate] = useState(task.deadline?.split("T")[0] ?? "");
  const [deadlineTime, setDeadlineTime] = useState(
    task.deadline?.includes("T") ? task.deadline.split("T")[1] : "",
  );
  const [progress, setProgress] = useState(taskProgress(task));
  const save = () => {
    const deadline = deadlineDate
      ? deadlineTime
        ? `${deadlineDate}T${deadlineTime}`
        : deadlineDate
      : null;
    patchTask(task.id, {
      title: title.trim() || task.title,
      description,
      deadline,
      progress,
      completed: progress >= 100,
    });
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={save}
    >
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
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <label htmlFor="task-progress">Progress</label>
          <span className="tabular-nums text-foreground">{progress}%</span>
        </div>
        <input
          id="task-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="mt-1 w-full accent-primary"
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
