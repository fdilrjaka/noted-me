import { supabase } from "@/integrations/supabase/client";
import {
  activeSubjects,
  extractLocalImageIds,
  getData,
  stripHtml,
  subjectPages,
  type Page,
} from "./store";
import { getImageBlob } from "./imageStore";

type BackupImage = { contentType: string; base64: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result adalah data URL ("data:<type>;base64,<data>") — kita cuma butuh bagian base64-nya.
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("gagal membaca blob gambar"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Kumpulin semua gambar `idb:<id>` yang dipakai satu atau beberapa halaman jadi base64,
 * supaya backup JSON tetap utuh & portable walau `content`-nya sendiri tidak diubah
 * (tetap berisi referensi `idb:<id>`, bukan data URL). Diambil dari IndexedDB dulu;
 * kalau gambarnya belum ada lokal (misal baru sync dari device lain) tapi sudah pernah
 * keupload, coba ambil dari Supabase Storage sebagai fallback. Gambar yang gagal
 * diambil dari kedua sumber (jarang terjadi) dilewati saja, tidak menggagalkan export.
 */
async function collectImagesForPages(pages: Page[]): Promise<Record<string, BackupImage>> {
  const ids = new Set<string>();
  for (const page of pages) {
    for (const id of extractLocalImageIds(page.content)) ids.add(id);
  }
  if (ids.size === 0) return {};

  const images = getData().images;
  const out: Record<string, BackupImage> = {};

  await Promise.all(
    [...ids].map(async (id) => {
      let blob = await getImageBlob(id);
      if (!blob) {
        const meta = images.find((img) => img.id === id && img.storage_path);
        if (meta?.storage_path) {
          try {
            const { data: publicUrl } = supabase.storage
              .from("note-images")
              .getPublicUrl(meta.storage_path);
            const res = await fetch(publicUrl.publicUrl);
            if (res.ok) blob = await res.blob();
          } catch {
            // biarkan blob tetap null, gambar ini dilewati di bawah
          }
        }
      }
      if (!blob) return;
      out[id] = {
        contentType: blob.type || "application/octet-stream",
        base64: await blobToBase64(blob),
      };
    }),
  );

  return out;
}

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

function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "catatan";
}

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
