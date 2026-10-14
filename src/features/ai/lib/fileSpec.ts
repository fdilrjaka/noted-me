/**
 * Spesifikasi file yang diminta model. Model tidak punya tool, jadi ia menulis satu blok
 *
 *   ```noteme-file
 *   {"format":"docx","filename":"laporan","content":"# Judul\n..."}
 *   ```
 *
 * lalu KLIEN membuat file aslinya (Word/PDF/Excel) di browser. Modul ini murni (tanpa DOM):
 * mengambil blok dari teks jawaban, memvalidasi, dan membuang blok itu dari teks yang ditampilkan.
 */

export type FileFormat = "docx" | "pdf" | "xlsx";
export type SheetCell = string | number | boolean | null;
export type SheetSpec = { name: string; rows: SheetCell[][] };

export type FileSpec =
  | { format: "docx" | "pdf"; filename: string; title: string; content: string }
  | { format: "xlsx"; filename: string; title: string; sheets: SheetSpec[] };

export const FILE_LIMITS = {
  maxFiles: 4,
  maxContentChars: 120_000,
  maxSheets: 10,
  maxRows: 5_000,
  maxCols: 60,
  maxCellChars: 2_000,
} as const;

export const FORMAT_LABEL: Record<FileFormat, string> = {
  docx: "Word",
  pdf: "PDF",
  xlsx: "Excel",
};

/** Blok ```noteme-file ... ```. Penutup wajib: blok yang terpotong tidak dianggap file. */
const BLOCK = /```noteme-file[ \t]*\r?\n([\s\S]*?)\r?\n```/g;
/** Blok yang masih terbuka (jawaban terpotong): disembunyikan dari tampilan. */
const OPEN_BLOCK = /```noteme-file[ \t]*\r?\n[\s\S]*$/;

export function safeFilename(raw: unknown, fallback: string): string {
  const base =
    typeof raw === "string"
      ? Array.from(raw.replace(/\.(docx|pdf|xlsx)$/i, ""))
          .map((ch) => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? " " : ch))
          .join("")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80)
      : "";
  return base || fallback;
}

function cleanCell(v: unknown): SheetCell {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v;
  return String(v).slice(0, FILE_LIMITS.maxCellChars);
}

function cleanSheetName(raw: unknown, index: number, used: Set<string>): string {
  // Excel: maks. 31 karakter, tanpa : \ / ? * [ ] dan nama harus unik (tanpa peduli huruf besar).
  let name =
    (typeof raw === "string" ? raw : "")
      .replace(/[:\\/?*[\]]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^'+|'+$/g, "")
      .trim()
      .slice(0, 31) || `Sheet${index + 1}`;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${n++}`;
    name = `${name.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

/** Validasi satu objek mentah jadi FileSpec, atau null kalau tidak layak. */
export function parseFileSpec(input: unknown, fallbackName = "dokumen"): FileSpec | null {
  if (!input || typeof input !== "object") return null;
  const o = input as {
    format?: unknown;
    title?: unknown;
    filename?: unknown;
    content?: unknown;
    sheets?: unknown;
  };
  const format = typeof o.format === "string" ? o.format.toLowerCase().trim() : "";
  const title = typeof o.title === "string" ? o.title.trim().slice(0, 200) : "";
  const filename = safeFilename(o.filename ?? title, fallbackName);

  if (format === "docx" || format === "pdf") {
    const content = typeof o.content === "string" ? o.content : "";
    if (!content.trim() || content.length > FILE_LIMITS.maxContentChars) return null;
    return { format, filename, title, content };
  }

  if (format === "xlsx") {
    if (!Array.isArray(o.sheets) || o.sheets.length === 0) return null;
    const used = new Set<string>();
    const sheets: SheetSpec[] = [];
    for (const [i, raw] of o.sheets.slice(0, FILE_LIMITS.maxSheets).entries()) {
      if (!raw || typeof raw !== "object") continue;
      const rowsRaw = (raw as { rows?: unknown }).rows;
      if (!Array.isArray(rowsRaw)) continue;
      const rows = rowsRaw
        .slice(0, FILE_LIMITS.maxRows)
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => r.slice(0, FILE_LIMITS.maxCols).map(cleanCell));
      if (rows.length === 0) continue;
      sheets.push({ name: cleanSheetName((raw as { name?: unknown }).name, i, used), rows });
    }
    return sheets.length > 0 ? { format: "xlsx", filename, title, sheets } : null;
  }

  return null;
}

export type ParsedReply = {
  /** Teks jawaban tanpa blok file (untuk ditampilkan sebagai Markdown). */
  text: string;
  files: FileSpec[];
  /** Ada blok file yang tidak bisa dibaca (JSON rusak / tidak valid / terpotong). */
  brokenCount: number;
};

export function extractFiles(reply: string): ParsedReply {
  const files: FileSpec[] = [];
  let broken = 0;

  let text = reply.replace(BLOCK, (_m, body: string) => {
    let spec: FileSpec | null = null;
    try {
      spec = parseFileSpec(JSON.parse(body), `dokumen-${files.length + 1}`);
    } catch {
      spec = null;
    }
    if (spec && files.length < FILE_LIMITS.maxFiles) files.push(spec);
    else broken++;
    return "";
  });

  if (OPEN_BLOCK.test(text)) {
    broken++;
    text = text.replace(OPEN_BLOCK, "");
  }
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), files, brokenCount: broken };
}

/** Nama unik kalau ada beberapa file dengan nama sama dalam satu jawaban. */
export function downloadName(spec: FileSpec): string {
  return `${spec.filename}.${spec.format}`;
}
