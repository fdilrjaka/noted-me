/** Konversi & unduh dari panel: Word <-> PDF, Markdown, CSV, serta Excel -> Word/PDF. */
import { buildFileBlob, triggerDownload } from "./buildFile";
import { FORMAT_LABEL, type FileSpec, type SheetCell } from "./fileSpec";

export type ExportTarget = "docx" | "pdf" | "xlsx" | "md" | "csv";

function csvCell(v: SheetCell): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: SheetCell[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Tabel Markdown untuk satu lembar (baris pertama = header). */
function sheetToMarkdown(rows: SheetCell[][]): string {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const cell = (v: SheetCell | undefined) =>
    v === null || v === undefined
      ? ""
      : String(v)
          .replace(/\|/g, "\\|")
          .replace(/\s*\n\s*/g, " ");
  const line = (r: SheetCell[]) =>
    `| ${Array.from({ length: width }, (_, i) => cell(r[i])).join(" | ")} |`;
  const [head = [], ...body] = rows;
  return [
    line(head),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.map(line),
  ].join("\n");
}

export function specToMarkdown(spec: FileSpec): string {
  if (spec.format === "xlsx") {
    const parts = spec.title ? [`# ${spec.title}`] : [];
    for (const s of spec.sheets) parts.push(`## ${s.name}\n\n${sheetToMarkdown(s.rows)}`);
    return parts.join("\n\n");
  }
  const hasH1 = /^\s*#\s/.test(spec.content);
  return spec.title && !hasH1 ? `# ${spec.title}\n\n${spec.content}` : spec.content;
}

export function exportTargets(spec: FileSpec): Array<{ target: ExportTarget; label: string }> {
  const all: Array<{ target: ExportTarget; label: string }> =
    spec.format === "xlsx"
      ? [
          { target: "xlsx", label: `${FORMAT_LABEL.xlsx} (.xlsx)` },
          { target: "csv", label: "CSV (lembar ini)" },
          { target: "docx", label: `${FORMAT_LABEL.docx} (.docx)` },
          { target: "pdf", label: `${FORMAT_LABEL.pdf} (.pdf)` },
          { target: "md", label: "Markdown (.md)" },
        ]
      : [
          { target: "docx", label: `${FORMAT_LABEL.docx} (.docx)` },
          { target: "pdf", label: `${FORMAT_LABEL.pdf} (.pdf)` },
          { target: "md", label: "Markdown (.md)" },
        ];
  return all;
}

export async function exportAs(
  spec: FileSpec,
  target: ExportTarget,
  sheetIndex = 0,
): Promise<void> {
  if (target === "md") {
    triggerDownload(
      new Blob([specToMarkdown(spec)], { type: "text/markdown;charset=utf-8" }),
      `${spec.filename}.md`,
    );
    return;
  }
  if (target === "csv") {
    if (spec.format !== "xlsx") return;
    const sheet = spec.sheets[sheetIndex] ?? spec.sheets[0];
    if (!sheet) return;
    const suffix = spec.sheets.length > 1 ? `-${sheet.name}` : "";
    // BOM supaya Excel membaca UTF-8 dengan benar.
    triggerDownload(
      new Blob(["\uFEFF", toCsv(sheet.rows)], { type: "text/csv;charset=utf-8" }),
      `${spec.filename}${suffix}.csv`,
    );
    return;
  }
  if (target === spec.format) {
    triggerDownload(await buildFileBlob(spec), `${spec.filename}.${target}`);
    return;
  }
  if (target === "xlsx") return; // dokumen -> Excel tidak ditawarkan
  const converted: FileSpec = {
    format: target,
    filename: spec.filename,
    title: spec.title,
    content: specToMarkdown(spec),
  };
  triggerDownload(await buildFileBlob(converted), `${spec.filename}.${target}`);
}
