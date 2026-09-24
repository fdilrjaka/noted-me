import { checkpoint, patchNode, type TableCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, computeNodeScale, type OnSize } from "./NodeShell";

const btn =
  "press-sm rounded-md font-medium text-muted-foreground hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10";

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

  const scale = computeNodeScale(node.w, node.h, { w: 320, h: 220 });

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="manual">
      <div className="flex h-full flex-col gap-2">
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full border-collapse">
            <tbody>
              {node.cells.map((row, r) => (
                <tr
                  key={r}
                  style={r === 0 ? { backgroundColor: `${color}22` } : undefined}
                  className="border-b border-slate-200 last:border-b-0 dark:border-white/10"
                >
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`border-r border-slate-200 p-0 last:border-r-0 dark:border-white/10 ${
                        r === 0 ? "font-semibold" : ""
                      }`}
                    >
                      <input
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
                        style={{
                          fontSize: `${Math.round(12 * scale)}px`,
                          padding: `${Math.round(5 * scale)}px ${Math.round(8 * scale)}px`,
                        }}
                        className="w-full min-w-16 bg-transparent outline-none focus:bg-primary/10"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={btn}
            style={{
              fontSize: `${Math.max(10, Math.round(11 * scale))}px`,
              padding: `${Math.round(2 * scale)}px ${Math.round(7 * scale)}px`,
            }}
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
            style={{
              fontSize: `${Math.max(10, Math.round(11 * scale))}px`,
              padding: `${Math.round(2 * scale)}px ${Math.round(7 * scale)}px`,
            }}
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
            style={{
              fontSize: `${Math.max(10, Math.round(11 * scale))}px`,
              padding: `${Math.round(2 * scale)}px ${Math.round(7 * scale)}px`,
            }}
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
            style={{
              fontSize: `${Math.max(10, Math.round(11 * scale))}px`,
              padding: `${Math.round(2 * scale)}px ${Math.round(7 * scale)}px`,
            }}
            onClick={() => {
              checkpoint();
              set(node.cells.map((r) => r.slice(0, -1)));
            }}
          >
            − Kolom
          </button>
        </div>
      </div>
    </NodeShell>
  );
}
