import { Link } from "@tanstack/react-router";
import { deadlineLabel } from "@/features/todo/utils";
import { taskProgress } from "@/lib/noteme/todoStore";
import type { TrackerCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";
import { CategorySelect, useCategoryTasks } from "./TodoNode";

/** Node Live: rata-rata progress task sebuah kategori + deadline terdekat. */
export function TrackerNodeView({
  node,
  selected,
  onSize,
}: {
  node: TrackerCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const { tasks } = useCategoryTasks(node.categoryId);
  const color = PALETTE[node.color].solid;
  const total = tasks.length;
  const avg = total ? Math.round(tasks.reduce((n, t) => n + taskProgress(t), 0) / total) : 0;
  const done = tasks.filter((t) => taskProgress(t) >= 100).length;
  const overdue = tasks.filter(
    (t) => taskProgress(t) < 100 && deadlineLabel(t.deadline)?.overdue,
  ).length;
  const upcoming = tasks
    .filter((t) => taskProgress(t) < 100 && t.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 3);

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="live">
      <CategorySelect nodeId={node.id} categoryId={node.categoryId} />
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-sm">Progress: {avg}%</span>
        <span className="text-[11px] text-muted-foreground">
          {done}/{total} selesai{overdue > 0 ? ` · ${overdue} terlambat` : ""}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${avg}%`, backgroundColor: color }}
        />
      </div>
      {upcoming.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1">
          {upcoming.map((t) => {
            const dl = deadlineLabel(t.deadline);
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{t.title}</span>
                <span
                  className={`flex-none ${dl?.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}
                >
                  {dl?.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 text-right text-[11px]">
        <Link to="/todo" className="font-medium hover:underline" style={{ color }}>
          Lihat detail →
        </Link>
      </div>
    </NodeShell>
  );
}
