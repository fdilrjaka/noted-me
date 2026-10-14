/**
 * Renderer Markdown kecil untuk jawaban AI. Aman by construction: SEMUA teks di-escape lebih dulu,
 * baru penanda Markdown diubah jadi tag. URL tautan diperiksa lewat isSafeUrl. Hasilnya tetap
 * dilewatkan sanitizeStoredHtml oleh pemanggil sebagai lapisan kedua.
 *
 * Yang didukung: judul, paragraf, **tebal**, *miring*, ~~coret~~, `kode`, blok kode, daftar
 * (satu tingkat), kutipan, garis, tabel, tautan. Daftar bersarang diratakan.
 */
import { isSafeUrl } from "@/lib/noteme/sanitizeHtml";

const PH_START = "\uE000";
const PH_END = "\uE001";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emphasis(s: string): string {
  return s
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~\n]+?)~~/g, "<del>$1</del>")
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, "$1<em>$2</em>");
}

function renderInline(src: string): string {
  const stash: string[] = [];
  const hold = (html: string) => {
    stash.push(html);
    return `${PH_START}${stash.length - 1}${PH_END}`;
  };

  let s = src.split(PH_START).join("").split(PH_END).join("");
  s = s.replace(/`([^`\n]+)`/g, (_m, code: string) => hold(`<code>${escapeHtml(code)}</code>`));
  s = escapeHtml(s);
  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
    isSafeUrl(url)
      ? hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${emphasis(label)}</a>`)
      : label,
  );
  s = emphasis(s);

  const restore = new RegExp(`${PH_START}(\\d+)${PH_END}`, "g");
  for (let pass = 0; pass < 3; pass++) {
    const next = s.replace(restore, (_m, i: string) => stash[Number(i)] ?? "");
    if (next === s) break;
    s = next;
  }
  return s;
}

const FENCE = /^\s*```\s*([\w+#.-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*(\d+)[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

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

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|").trim());
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    const fence = FENCE.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i] ?? "")) {
        code.push(lines[i] ?? "");
        i++;
      }
      i++; // lewati penutup (atau akhir teks kalau tidak ditutup)
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
      out.push(`<pre><code${lang}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      out.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
      i++;
      continue;
    }

    if (HR.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        inner.push(QUOTE.exec(lines[i] ?? "")?.[1] ?? "");
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(inner.join("\n"))}</blockquote>`);
      continue;
    }

    const next = lines[i + 1] ?? "";
    if (line.includes("|") && next.includes("|") && TABLE_SEP.test(next)) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").includes("|") && (lines[i] ?? "").trim()) {
        rows.push(splitRow(lines[i] ?? ""));
        i++;
      }
      const th = head.map((c) => `<th>${renderInline(c)}</th>`).join("");
      const body = rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("");
      out.push(
        `<div class="ai-table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`,
      );
      continue;
    }

    const ul = UL.test(line);
    const ol = OL.exec(line);
    if (ul || ol) {
      const items: string[] = [];
      const start = ol ? Number(ol[1]) : 1;
      while (i < lines.length) {
        const cur = lines[i] ?? "";
        const m = ul ? UL.exec(cur) : OL.exec(cur);
        if (m) {
          items.push(ul ? (m[1] ?? "") : (m[2] ?? ""));
          i++;
        } else if (/^\s{2,}\S/.test(cur) && items.length > 0 && !isBlockStart(cur)) {
          items[items.length - 1] += ` ${cur.trim()}`;
          i++;
        } else {
          break;
        }
      }
      const lis = items.map((t) => `<li>${renderInline(t)}</li>`).join("");
      out.push(ul ? `<ul>${lis}</ul>` : `<ol${start !== 1 ? ` start="${start}"` : ""}>${lis}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      if (!cur.trim() || (para.length > 0 && isBlockStart(cur))) break;
      para.push(cur);
      i++;
    }
    out.push(`<p>${para.map(renderInline).join("<br>")}</p>`);
  }

  return out.join("");
}

/** Judul halaman dari jawaban: judul/baris pertama tanpa penanda Markdown. */
export function titleFromMarkdown(md: string, fallback: string): string {
  for (const raw of md.split("\n")) {
    const t = raw
      .replace(/^[#>\-*+\s]+/, "")
      .replace(/[*_`~]/g, "")
      .trim();
    if (t) return t.length > 60 ? `${t.slice(0, 57)}…` : t;
  }
  return fallback;
}
