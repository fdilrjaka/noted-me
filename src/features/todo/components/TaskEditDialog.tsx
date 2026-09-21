import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import {
  deleteTask,
  normalizeTags,
  patchTask,
  taskProgress,
  type TodoTask,
} from "@/lib/noteme/todoStore";
import { tagColor } from "../utils";

export function TaskEditDialog({ task, onClose }: { task: TodoTask; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadlineDate, setDeadlineDate] = useState(task.deadline?.split("T")[0] ?? "");
  const [deadlineTime, setDeadlineTime] = useState(
    task.deadline?.includes("T") ? task.deadline.split("T")[1] : "",
  );
  const [progress, setProgress] = useState(taskProgress(task));
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const commitTagDraft = () => {
    if (!tagDraft.trim()) return tags;
    const next = normalizeTags([...tags, tagDraft]);
    setTags(next);
    setTagDraft("");
    return next;
  };
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
      tags: normalizeTags([...tags, tagDraft]),
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
        <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor="task-tags">
          Tag
        </label>
        <div className="glass-input mt-1 flex flex-wrap items-center gap-1.5 rounded-2xl px-2.5 py-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              aria-label={`Hapus tag ${tag}`}
              className="press-sm inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${tagColor(tag)}22`, color: tagColor(tag) }}
            >
              #{tag}
              <X className="size-3" />
            </button>
          ))}
          <input
            id="task-tags"
            value={tagDraft}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) {
                setTags(normalizeTags([...tags, v.slice(0, -1)]));
                setTagDraft("");
              } else setTagDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTagDraft();
              }
              if (e.key === "Backspace" && !tagDraft && tags.length) setTags(tags.slice(0, -1));
            }}
            placeholder={tags.length ? "" : "Ketik tag lalu Enter"}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
