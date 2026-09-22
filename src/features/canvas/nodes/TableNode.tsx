import { checkpoint, patchNode, type TableCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";

const btn =
  "press-sm rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10";

/** Tabel sederhana manual: baris pertama diperlakukan sebagai header. */
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

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="manual">
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
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
                className={`min-w-0 flex-1 border-slate-200 bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-primary/10 dark:border-white/10 ${
                  r === 0 ? "font-semibold" : ""
                } ${c > 0 ? "border-l" : ""} ${r > 0 ? "border-t" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          className={btn}
          onClick={() => {
            checkpoint();
            set([...node.cells, Array.from({ length: cols }, () => "")]);
          }}
        >
          + Baris
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
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
          onClick={() => {
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
          onClick={() => {
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
