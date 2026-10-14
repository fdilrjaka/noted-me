/** Excel (.xlsx) dari lembar kerja. `exceljs` di-import dinamis (berat). */
import type { SheetSpec } from "./fileSpec";

const FORMULA = /^=[A-Za-z(]/;

export async function buildXlsx(sheets: SheetSpec[], creator = "NoteMe"): Promise<Blob> {
  const mod = await import("exceljs");
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = creator;
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    const widths: number[] = [];

    sheet.rows.forEach((row, r) => {
      const excelRow = ws.addRow([]);
      row.forEach((v, c) => {
        const cell = excelRow.getCell(c + 1);
        if (typeof v === "string" && FORMULA.test(v)) cell.value = { formula: v.slice(1) };
        else cell.value = v;
        if (typeof v === "string") cell.alignment = { wrapText: true, vertical: "top" };
        const len =
          typeof v === "string"
            ? Math.max(...v.split("\n").map((s) => s.length))
            : String(v ?? "").length;
        widths[c] = Math.max(widths[c] ?? 8, Math.min(60, len + 2));
      });
      if (r === 0) {
        excelRow.font = { bold: true };
        excelRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        });
      }
    });

    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
    if (sheet.rows.length > 1) ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
