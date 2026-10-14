/**
 * Markdown -> blok sederhana, dipakai pembuat Word dan PDF. Murni (tanpa DOM).
 * Mendukung: judul, paragraf, **tebal**, *miring*, `kode`, daftar (dengan tingkat), kutipan,
 * garis, tabel, blok kode. Tautan dijadikan teks biasa + URL di dalam kurung.
 */
export type Run = { text: string; bold?: boolean; italic?: boolean; code?: boolean };
export type ListItem = { runs: Run[]; level: number };

export type Block =
  | { type: "heading"; level: number; runs: Run[] }
  | { type: "paragraph"; runs: Run[] }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "quote"; runs: Run[] }
  | { type: "code"; text: string }
  | { type: "table"; head: Run[][]; rows: Run[][][]; align: Array<"left" | "center" | "right"> }
  | { type: "hr" };

export function parseInline(src: string): Run[] {
  const s = src.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
    label === url ? url : `${label} (${url})`,
  );
  const runs: Run[] = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(~~[^~\n]+?~~)|((?<![*\w])\*[^*\n]+?\*(?![*\w]))/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) runs.push({ text: s.slice(last, idx) });
    const tok = m[0];
    if (m[1]) runs.push({ text: tok.slice(1, -1), code: true });
    else if (m[2]) runs.push({ text: tok.slice(2, -2), bold: true });
    else if (m[3]) runs.push({ text: tok.slice(2, -2) });
    else runs.push({ text: tok.slice(1, -1), italic: true });
    last = idx + tok.length;
  }
  if (last < s.length) runs.push({ text: s.slice(last) });
  return runs.length > 0 ? runs : [{ text: "" }];
}

const FENCE = /^\s*```/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const UL = /^(\s*)[-*+]\s+(.*)$/;
const OL = /^(\s*)\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** Pecah baris tabel di `|` yang tidak di-escape; `\\|` menjadi `|` biasa di dalam sel. */
function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|").trim());
}

function levelOf(indent: string): number {
  return Math.min(3, Math.floor(indent.replace(/\t/g, "  ").length / 2));
}

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    HR.test(line) ||
    UL.test(line) ||
    OL.test(line) ||
    QUOTE.test(line)
  );
}

export function parseMarkdownBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (FENCE.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i] ?? "")) code.push(lines[i++] ?? "");
      i++;
      out.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      out.push({ type: "heading", level: h[1]!.length, runs: parseInline(h[2] ?? "") });
      i++;
      continue;
    }
    if (HR.test(line)) {
      out.push({ type: "hr" });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        inner.push(QUOTE.exec(lines[i] ?? "")?.[1] ?? "");
        i++;
      }
      out.push({ type: "quote", runs: parseInline(inner.join(" ")) });
      continue;
    }

    const next = lines[i + 1] ?? "";
    if (line.includes("|") && TABLE_SEP.test(next)) {
      const head = splitRow(line);
      const align = splitRow(next).map((c) =>
        c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left",
      ) as Array<"left" | "center" | "right">;
      i += 2;
      const rows: Run[][][] = [];
      while (i < lines.length && (lines[i] ?? "").includes("|") && (lines[i] ?? "").trim()) {
        const cells = splitRow(lines[i] ?? "");
        while (cells.length < head.length) cells.push("");
        rows.push(cells.slice(0, head.length).map(parseInline));
        i++;
      }
      out.push({ type: "table", head: head.map(parseInline), rows, align });
      continue;
    }

    const ulM = UL.exec(line);
    const olM = OL.exec(line);
    if (ulM || olM) {
      const ordered = !ulM;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? "";
        const m = ordered ? OL.exec(cur) : UL.exec(cur);
        if (m) {
          items.push({ runs: parseInline(m[2] ?? ""), level: levelOf(m[1] ?? "") });
          i++;
        } else if (/^\s{2,}\S/.test(cur) && items.length > 0 && !isBlockStart(cur)) {
          items[items.length - 1]!.runs.push(...parseInline(` ${cur.trim()}`));
          i++;
        } else break;
      }
      out.push({ type: "list", ordered, items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      if (!cur.trim() || (para.length > 0 && isBlockStart(cur))) break;
      para.push(cur.trim());
      i++;
    }
    out.push({ type: "paragraph", runs: parseInline(para.join(" ")) });
  }
  return out;
}

export function runsToText(runs: Run[]): string {
  return runs.map((r) => r.text).join("");
}
