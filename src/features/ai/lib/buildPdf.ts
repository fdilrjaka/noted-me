/**
 * PDF dengan teks asli (bisa dipilih/dicari), bukan screenshot. Memakai jsPDF + font bawaan
 * Helvetica/Courier, jadi hanya karakter Latin (WinAnsi) yang tampil; sisanya jadi "?".
 */
import { parseMarkdownBlocks, type Run } from "./mdBlocks";

const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export function toPdfText(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9) out += "    ";
    else if (code === 0xa0) out += " ";
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff)) out += ch;
    else if (WIN_ANSI_EXTRA.includes(ch)) out += ch;
    else if (code === 0x2192) out += "->";
    else if (code === 0x2713 || code === 0x2714) out += "v";
    else if (
      code < 0x20 ||
      (code >= 0x200b && code <= 0x200f) ||
      code >= 0x1f000 ||
      code === 0xfe0f
    )
      continue;
    else out += "?";
  }
  return out;
}

type Word = { text: string; bold: boolean; italic: boolean; code: boolean };

function toWords(runs: Run[]): Word[] {
  const words: Word[] = [];
  for (const r of runs) {
    for (const part of toPdfText(r.text).split(/(\s+)/)) {
      if (part) words.push({ text: part, bold: !!r.bold, italic: !!r.italic, code: !!r.code });
    }
  }
  return words;
}

export async function buildPdf(title: string, markdown: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  if (title) doc.setProperties({ title: toPdfText(title), creator: "NoteMe" });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 56;
  const BOTTOM = PAGE_H - M;
  const FULL_W = PAGE_W - 2 * M;
  let y = M;

  const font = (w: { bold?: boolean; italic?: boolean; code?: boolean }, size: number) => {
    const family = w.code ? "courier" : "helvetica";
    const style =
      w.bold && w.italic ? "bolditalic" : w.bold ? "bold" : w.italic ? "italic" : "normal";
    doc.setFont(family, style);
    doc.setFontSize(size);
  };

  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = M;
    }
  };

  /** Satu baris = daftar kata + posisi x. */
  const layout = (runs: Run[], size: number, width: number, baseBold = false): Word[][] => {
    const lines: Word[][] = [];
    let line: Word[] = [];
    let used = 0;
    for (const raw of toWords(runs)) {
      const w = { ...raw, bold: raw.bold || baseBold };
      font(w, size);
      const wd = doc.getTextWidth(w.text);
      const space = /^\s+$/.test(w.text);
      if (!space && used + wd > width && line.length > 0) {
        while (line.length > 0 && /^\s+$/.test(line[line.length - 1]!.text)) line.pop();
        lines.push(line);
        line = [];
        used = 0;
      }
      if (space && line.length === 0) continue;
      line.push(w);
      used += wd;
    }
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1]!.text)) line.pop();
    if (line.length > 0 || lines.length === 0) lines.push(line);
    return lines;
  };

  const drawLine = (
    line: Word[],
    x: number,
    baseline: number,
    size: number,
    align: "left" | "center" | "right" = "left",
    width = 0,
  ) => {
    let total = 0;
    for (const w of line) {
      font(w, size);
      total += doc.getTextWidth(w.text);
    }
    let cx =
      align === "center" ? x + (width - total) / 2 : align === "right" ? x + width - total : x;
    for (const w of line) {
      font(w, size);
      doc.text(w.text, cx, baseline);
      cx += doc.getTextWidth(w.text);
    }
  };

  const paragraph = (
    runs: Run[],
    opts: {
      size?: number;
      x?: number;
      width?: number;
      bold?: boolean;
      after?: number;
      bullet?: string;
    } = {},
  ) => {
    const size = opts.size ?? 11;
    const x = opts.x ?? M;
    const width = opts.width ?? FULL_W;
    const lh = size * 1.4;
    const lines = layout(runs, size, width, opts.bold);
    lines.forEach((ln, i) => {
      ensure(lh);
      if (i === 0 && opts.bullet) {
        font({}, size);
        doc.text(toPdfText(opts.bullet), x - 14, y + size);
      }
      drawLine(ln, x, y + size, size);
      y += lh;
    });
    y += opts.after ?? 6;
  };

  doc.setTextColor(20, 20, 20);
  const blocks = parseMarkdownBlocks(markdown);
  if (title && !(blocks[0]?.type === "heading" && blocks[0].level === 1)) {
    paragraph([{ text: title }], { size: 22, bold: true, after: 12 });
  }

  const HEAD_SIZE = [22, 17, 14, 12.5, 11.5, 11];
  for (const b of blocks) {
    switch (b.type) {
      case "heading": {
        const size = HEAD_SIZE[Math.min(b.level, 6) - 1]!;
        y += b.level <= 2 ? 8 : 4;
        ensure(size * 1.4 * 2); // judul tidak boleh sendirian di dasar halaman
        paragraph(b.runs, { size, bold: true, after: 6 });
        break;
      }
      case "paragraph":
        paragraph(b.runs);
        break;
      case "list": {
        const counters = [0, 0, 0, 0];
        for (const it of b.items) {
          counters[it.level] = (counters[it.level] ?? 0) + 1;
          for (let l = it.level + 1; l < counters.length; l++) counters[l] = 0;
          const indent = 22 + it.level * 18;
          paragraph(it.runs, {
            x: M + indent,
            width: FULL_W - indent,
            after: 3,
            bullet: b.ordered ? `${counters[it.level]}.` : it.level % 2 === 0 ? "•" : "-",
          });
        }
        y += 4;
        break;
      }
      case "quote": {
        const startY = y;
        const startPage = doc.getNumberOfPages();
        paragraph(
          b.runs.map((r) => ({ ...r, italic: true })),
          { x: M + 16, width: FULL_W - 16, after: 2 },
        );
        if (doc.getNumberOfPages() === startPage) {
          doc.setDrawColor(160);
          doc.setLineWidth(2);
          doc.line(M + 4, startY, M + 4, y - 2);
        }
        y += 6;
        break;
      }
      case "code": {
        const size = 9.5;
        const lh = size * 1.35;
        for (const raw of toPdfText(b.text).split("\n")) {
          // Pecah baris kode yang terlalu lebar per karakter.
          font({ code: true }, size);
          const perLine = Math.max(10, Math.floor((FULL_W - 12) / doc.getTextWidth("M")));
          const chunks =
            raw.length === 0 ? [""] : (raw.match(new RegExp(`.{1,${perLine}}`, "g")) ?? [""]);
          for (const c of chunks) {
            ensure(lh);
            doc.setFillColor(243, 243, 243);
            doc.rect(M, y, FULL_W, lh, "F");
            font({ code: true }, size);
            doc.text(c, M + 6, y + size);
            y += lh;
          }
        }
        y += 8;
        break;
      }
      case "hr":
        ensure(14);
        doc.setDrawColor(190);
        doc.setLineWidth(0.7);
        doc.line(M, y + 5, PAGE_W - M, y + 5);
        y += 14;
        break;
      case "table": {
        const cols = b.head.length;
        const size = 10;
        const pad = 5;
        const lh = size * 1.35;
        const colW = FULL_W / cols;
        const drawRow = (cells: Run[][], header: boolean) => {
          const laid = cells.map((c) => layout(c, size, colW - 2 * pad, header));
          const h = Math.max(...laid.map((l) => l.length)) * lh + 2 * pad;
          ensure(h);
          if (header) {
            doc.setFillColor(232, 232, 232);
            doc.rect(M, y, FULL_W, h, "F");
          }
          doc.setDrawColor(170);
          doc.setLineWidth(0.5);
          laid.forEach((lines, c) => {
            const x = M + c * colW;
            doc.rect(x, y, colW, h);
            lines.forEach((ln, i) =>
              drawLine(
                ln,
                x + pad,
                y + pad + size + i * lh,
                size,
                b.align[c] ?? "left",
                colW - 2 * pad,
              ),
            );
          });
          y += h;
        };
        drawRow(b.head, true);
        b.rows.forEach((r) => drawRow(r, false));
        y += 10;
        break;
      }
    }
  }

  // Nomor halaman.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font({}, 9);
    doc.setTextColor(130);
    doc.text(`${p} / ${pages}`, PAGE_W / 2, PAGE_H - 28, { align: "center" });
  }
  return doc.output("blob");
}
