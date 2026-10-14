import { Plus } from "lucide-react";
import { FILE_LIMITS, type SheetCell, type SheetSpec } from "../lib/fileSpec";
import { columnLetter, parseCellInput } from "../lib/sheetUtils";

const MAX_SHOWN_ROWS = 300;

const isFormula = (v: SheetCell) => typeof v === "string" && /^=[A-Za-z(]/.test(v);

type Props = {
  sheet: SheetSpec;
  editable: boolean;
  onChange?: (rows: SheetCell[][]) => void;
};

export function SheetGrid({ sheet, editable, onChange }: Props) {
  const rows = sheet.rows;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const shown = rows.slice(0, MAX_SHOWN_ROWS);

  const setCell = (r: number, c: number, raw: string) => {
    if (!onChange) return;
    const next = rows.map((row) => row.slice());
    const row = next[r];
    if (!row) return;
    while (row.length <= c) row.push(null);
    row[c] = parseCellInput(raw);
    onChange(next);
  };

  const addRow = () => {
    if (!onChange || rows.length >= FILE_LIMITS.maxRows) return;
    onChange([...rows.map((r) => r.slice()), Array.from({ length: cols }, () => null)]);
  };
  const addColumn = () => {
    if (!onChange || cols >= FILE_LIMITS.maxCols) return;
    onChange(rows.map((r) => [...Array.from({ length: cols }, (_, i) => r[i] ?? null), null]));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 w-10 border border-foreground/15 bg-muted" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 min-w-24 border border-foreground/15 bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  {columnLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r}>
                <th className="sticky left-0 z-10 border border-foreground/15 bg-muted px-2 text-xs font-medium text-muted-foreground">
                  {r + 1}
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const v = row[c] ?? null;
                  const header = r === 0;
                  const cellCls = `border border-foreground/15 ${header ? "bg-foreground/5 font-semibold" : ""}`;
                  if (editable) {
                    return (
                      <td key={c} className={cellCls}>
                        <input
                          aria-label={`${columnLetter(c)}${r + 1}`}
                          defaultValue={v === null ? "" : String(v)}
                          // key memaksa input segar kalau nilai berubah dari luar (mis. Kembalikan).
                          key={`${r}-${c}-${v === null ? "" : String(v)}`}
                          onBlur={(e) => {
                            if (e.target.value !== (v === null ? "" : String(v)))
                              setCell(r, c, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          className={`w-full min-w-24 bg-transparent px-2 py-1 outline-none focus:bg-primary/10 ${
                            typeof v === "number" ? "text-right" : ""
                          }`}
                        />
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c}
                      className={`${cellCls} max-w-64 px-2 py-1 align-top [overflow-wrap:anywhere] ${
                        typeof v === "number" ? "text-right tabular-nums" : ""
                      } ${isFormula(v) ? "italic text-muted-foreground" : ""}`}
                      title={isFormula(v) ? "Rumus: dihitung Excel saat file dibuka" : undefined}
                    >
                      {v === null ? "" : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(rows.length > shown.length || editable) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 px-3 py-2 text-xs text-muted-foreground">
          {rows.length > shown.length && (
            <span>
              Menampilkan {shown.length} dari {rows.length} baris (file tetap berisi semuanya).
            </span>
          )}
          {editable && (
            <>
              <button
                type="button"
                onClick={addRow}
                className="press-sm flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-foreground/10"
              >
                <Plus className="size-3.5" aria-hidden="true" /> Baris
              </button>
              <button
                type="button"
                onClick={addColumn}
                className="press-sm flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-foreground/10"
              >
                <Plus className="size-3.5" aria-hidden="true" /> Kolom
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
