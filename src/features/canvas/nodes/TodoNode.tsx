import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  TODO_CATEGORIES,
  categorySections,
  createSection,
  createTask,
  taskProgress,
  toggleTaskCompleted,
  useTodoData,
} from "@/lib/noteme/todoStore";
import { checkpoint, patchNode, type TodoCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";

const MAX_ROWS = 6;

export function useCategoryTasks(categoryId: string) {
  const data = useTodoData();
  return useMemo(() => {
    const sections = categorySections(data, categoryId);
    const ids = new Set(sections.map((s) => s.id));
    const tasks = data.tasks
      .filter((t) => !t.deleted && ids.has(t.section_id))
      .sort(
        (a, b) =>
          Number(taskProgress(a) >= 100) - Number(taskProgress(b) >= 100) ||
          a.position - b.position,
      );
    return { sections, tasks };
  }, [data, categoryId]);
}

export function CategorySelect({ nodeId, categoryId }: { nodeId: string; categoryId: string }) {
  return (
    <select
      value={categoryId}
      onChange={(e) => {
        checkpoint();
        patchNode(nodeId, { categoryId: e.target.value });
      }}
      aria-label="Kategori to-do"
      className="w-full rounded-lg bg-slate-100 px-2 py-1 text-xs outline-none dark:bg-slate-800"
    >
      {TODO_CATEGORIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

/** Node Live: daftar task sebuah kategori dari halaman To Do List (dua arah). */
export function TodoNodeView({
  node,
  selected,
  onSize,
}: {
  node: TodoCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const { sections, tasks } = useCategoryTasks(node.categoryId);
  const [draft, setDraft] = useState("");
  const color = PALETTE[node.color].solid;
  const done = tasks.filter((t) => taskProgress(t) >= 100).length;

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    // Task baru langsung tersimpan di halaman To Do List (section pertama kategori ini).
    const sectionId = sections[0]?.id ?? createSection(node.categoryId, "To Do");
    createTask(sectionId, title);
    setDraft("");
  };

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="live">
      <CategorySelect nodeId={node.id} categoryId={node.categoryId} />
      <ul className="mt-2 flex flex-col gap-1">
        {tasks.slice(0, MAX_ROWS).map((t) => {
          const p = taskProgress(t);
          return (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                role="checkbox"
                aria-checked={p >= 100}
                aria-label={`Tandai ${t.title}`}
                onClick={() => toggleTaskCompleted(t.id)}
                className="flex size-4 flex-none items-center justify-center rounded border-2"
                style={{ borderColor: color, backgroundColor: p >= 100 ? color : "transparent" }}
              >
                {p >= 100 && <Check className="size-3 text-white" strokeWidth={3} />}
              </button>
              <span
                className={`min-w-0 flex-1 truncate ${p >= 100 ? "text-muted-foreground line-through" : ""}`}
              >
                {t.title}
              </span>
              {p > 0 && p < 100 && (
                <span className="text-[11px] tabular-nums text-muted-foreground">{p}%</span>
              )}
            </li>
          );
        })}
        {tasks.length === 0 && (
          <li className="text-xs text-muted-foreground">Belum ada task di kategori ini.</li>
        )}
        {tasks.length > MAX_ROWS && (
          <li className="text-xs text-muted-foreground">+{tasks.length - MAX_ROWS} task lainnya</li>
        )}
      </ul>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="+ Tambah task, Enter"
        aria-label="Tambah task baru"
        className="mt-2 w-full rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground dark:bg-slate-800"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {done}/{tasks.length} selesai
        </span>
        <Link to="/todo" className="font-medium hover:underline" style={{ color }}>
          Buka To Do List →
        </Link>
      </div>
    </NodeShell>
  );
}
