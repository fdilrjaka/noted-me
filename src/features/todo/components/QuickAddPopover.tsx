import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { NaturalDateTitleInput } from "@/components/noteme/NaturalDateTitleInput";
import { createSection, createTask } from "@/lib/noteme/todoStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { formatDetectedBadge } from "../utils";

export type QuickAddTarget = { value: string; label: string };

/** Target "new:<kategori>" = kategori belum punya section, buat section "To Do" saat menyimpan. */
export function QuickAddPopover({
  trigger,
  targets,
  defaultTarget,
}: {
  trigger: ReactNode;
  targets: QuickAddTarget[];
  defaultTarget: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const target = picked && targets.some((t) => t.value === picked) ? picked : defaultTarget;

  const submit = () => {
    if (!title.trim()) return;
    const sectionId = target.startsWith("new:") ? createSection(target.slice(4), "To Do") : target;
    createTask(sectionId, title, date ? (time ? `${date}T${time}` : date) : null);
    toast.success("Task ditambahkan");
    setTitle("");
    setDate("");
    setTime("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={14}
        className="w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl p-3.5"
      >
        <p className="mb-2 text-sm font-semibold">Quick add task</p>
        <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-white/10">
          <NaturalDateTitleInput
            autoFocus
            value={title}
            onChange={setTitle}
            onDetected={({ date: d, time: t }) => {
              setDate(d);
              setTime(t);
            }}
            onEnter={submit}
            placeholder="Judul task — coba 'besok jam 10.30'"
          />
        </div>
        {date && (
          <p className="mt-1.5 text-[11px] font-medium text-primary">
            {formatDetectedBadge(date, time)}
          </p>
        )}
        <div className="mt-2 flex gap-1.5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-slate-100 px-2 py-1.5 text-xs outline-none dark:bg-white/10"
          />
          <input
            type="time"
            value={time}
            disabled={!date}
            onChange={(e) => setTime(e.target.value)}
            className="min-w-0 flex-1 rounded-xl bg-slate-100 px-2 py-1.5 text-xs outline-none disabled:opacity-50 dark:bg-white/10"
          />
        </div>
        <select
          value={target}
          onChange={(e) => setPicked(e.target.value)}
          aria-label="Simpan ke"
          className="mt-2 w-full rounded-xl bg-slate-100 px-2.5 py-2 text-xs outline-none dark:bg-slate-800 dark:text-slate-100"
        >
          {targets.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="press-sm mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="size-4" /> Tambah task
        </button>
      </PopoverContent>
    </Popover>
  );
}
