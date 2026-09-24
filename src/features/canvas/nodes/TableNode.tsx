import { checkpoint, patchNode, type TableCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";

const btn =
  "press-sm rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10";

export function TableNodeView({
  node,
  selected,
  onSize,
}: {
  node: TableCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const color = PALETTE[node.color].solid;
  const rows = node.cells.length;
  const cols = node.cells[0]?.length ?? 0;
  const set = (cells: string[][]) => patchNode(node.id, { cells });
  const scale = Math.max(0.9, Math.min(2.0, node.w / 280));

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="manual">
      <div
        className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {node.cells.map((row, r) => (
          <div
            key={r}
            className="flex"
            style={r === 0 ? { backgroundColor: `${color}22` } : undefined}
          >
            {row.map((cell, c) => (
              <input
                key={c}
                value={cell}
                onFocus={checkpoint}
                onChange={(e) =>
                  set(
                    node.cells.map((rw, ri) =>
                      ri === r ? rw.map((v, ci) => (ci === c ? e.target.value : v)) : rw,
                    ),
                  )
                }
                aria-label={`Sel baris ${r + 1} kolom ${c + 1}`}
                style={{ fontSize: "1em", padding: `${scale * 6}px ${scale * 8}px` }}
                className={`min-w-0 flex-1 border-slate-200 bg-transparent outline-none focus:bg-primary/10 dark:border-white/10 ${
                  r === 0 ? "font-semibold" : ""
                } ${c > 0 ? "border-l" : ""} ${r > 0 ? "border-t" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        className="mt-1.5 flex flex-wrap gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={btn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            checkpoint();
            set([...node.cells, Array.from({ length: cols }, () => "")]);
          }}
        >
          + Baris
        </button>
        <button
          type="button"
          className={btn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            checkpoint();
            set(node.cells.map((r) => [...r, ""]));
          }}
        >
          + Kolom
        </button>
        <button
          type="button"
          className={btn}
          disabled={rows <= 1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            checkpoint();
            set(node.cells.slice(0, -1));
          }}
        >
          − Baris
        </button>
        <button
          type="button"
          className={btn}
          disabled={cols <= 1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            checkpoint();
            set(node.cells.map((r) => r.slice(0, -1)));
          }}
        >
          − Kolom
        </button>
      </div>
    </NodeShell>
  );
}
