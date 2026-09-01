import { activeSubjects, getData, stripHtml, subjectPages } from "./store";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Full backup as JSON — everything needed to restore the app's data (subjects + pages,
 * including page HTML content with any embedded images) independent of Supabase or
 * this browser's localStorage.
 */
export function exportBackupJson() {
  const data = getData();
  const payload = {
    app: "noteme",
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    pages: data.pages,
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
  const lines: string[] = [`# Backup Catatan NoteMe`, ``, `Diekspor: ${new Date().toLocaleString("id-ID")}`, ``];

  for (const subject of subjects) {
    lines.push(`## ${subject.name}`, ``);
    const pages = subjectPages(data, subject.id);
    for (const page of pages) {
      lines.push(`### ${page.title}`, ``);
      const text = stripHtml(page.content);
      lines.push(text || "_(kosong)_", ``);
    }
  }

  download(`noteme-backup-${stamp()}.md`, lines.join("\n"), "text/markdown");
}
