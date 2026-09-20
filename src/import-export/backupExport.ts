import {
  activeSubjects,
  extractLocalImageIds,
  getData,
  stripHtml,
  subjectPages,
} from "@/storage/local/dataCore";
import { collectImagesForPages, download, slugify, stamp } from "./shared";

/**
 * Full backup as JSON — everything needed to restore the app's data (subjects + pages,
 * including page HTML content with any embedded images) independent of Supabase or
 * this browser's localStorage.
 */
export async function exportBackupJson() {
  const data = getData();
  const images = await collectImagesForPages(data.pages);
  const payload = {
    app: "noteme",
    version: 2,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    pages: data.pages,
    images,
  };
  download(`noteme-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

/**
 * Human-readable backup — one Markdown-ish text file with every mata kuliah and pertemuan,
 * for quickly re-reading notes even without the app (embedded images are dropped, since they
 * don't translate to plain text).
 */
export function exportBackupMarkdown() {
  const data = getData();
  const subjects = activeSubjects(data);
  const lines: string[] = [
    `# Backup Catatan NoteMe`,
    ``,
    `Diekspor: ${new Date().toLocaleString("id-ID")}`,
    ``,
  ];

  for (const subject of subjects) {
    lines.push(`## ${subject.name}`, ``);
    const pages = subjectPages(data, subject.id);
    for (const page of pages) {
      lines.push(`### ${page.title}`, ``);
      const text = stripHtml(page.content);
      lines.push(text || "_(kosong)_", ``);
      const imageCount = extractLocalImageIds(page.content).length;
      if (imageCount > 0) {
        lines.push(`_(${imageCount} gambar tidak disertakan, lihat backup JSON)_`, ``);
      }
    }
  }

  download(`noteme-backup-${stamp()}.md`, lines.join("\n"), "text/markdown");
}

/**
 * Backup for a single pertemuan/page — same two formats as the full backup, scoped to
 * one note. Useful when the user just wants to save or share one page, not everything.
 */
export async function exportPageJson(pageId: string) {
  const data = getData();
  const page = data.pages.find((p) => p.id === pageId && !p.deleted);
  if (!page) return;
  const subject = data.subjects.find((s) => s.id === page.subject_id);
  const images = await collectImagesForPages([page]);
  const payload = {
    app: "noteme",
    version: 2,
    exportedAt: new Date().toISOString(),
    subject: subject ? { id: subject.id, name: subject.name } : null,
    page,
    images,
  };
  download(
    `noteme-${slugify(page.title)}-${stamp()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export function exportPageMarkdown(pageId: string) {
  const data = getData();
  const page = data.pages.find((p) => p.id === pageId && !p.deleted);
  if (!page) return;
  const subject = data.subjects.find((s) => s.id === page.subject_id);
  const lines: string[] = [`# ${page.title}`, ``];
  if (subject) lines.push(`Mata kuliah: ${subject.name}`, ``);
  lines.push(`Diekspor: ${new Date().toLocaleString("id-ID")}`, ``);
  lines.push(stripHtml(page.content) || "_(kosong)_");
  const imageCount = extractLocalImageIds(page.content).length;
  if (imageCount > 0) {
    lines.push(``, `_(${imageCount} gambar tidak disertakan, lihat backup JSON)_`);
  }
  download(`noteme-${slugify(page.title)}-${stamp()}.md`, lines.join("\n"), "text/markdown");
}
