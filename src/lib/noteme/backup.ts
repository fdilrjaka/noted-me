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
            // Bucket "note-images" privat (RLS by auth.uid()) — harus .download() lewat
            // client Supabase yang authenticated, bukan getPublicUrl()+fetch() biasa.
            const { data, error } = await supabase.storage
              .from("note-images")
              .download(meta.storage_path);
            if (!error && data) blob = data;
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

/**
 * Trigger download sebuah Blob. Dibuat setahan mungkin karena app ini juga jalan
 * di dalam iframe preview & di Safari iOS:
 *  - `URL.revokeObjectURL` TIDAK langsung dipanggil (Safari/iOS membatalkan download
 *    kalau URL-nya dicabut sebelum browser selesai membacanya).
 *  - kalau `<a download>` gagal / diblokir (iframe tanpa allow-downloads), fallback ke
 *    membuka blob di tab baru supaya user tetap bisa simpan manual.
 */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  let clicked = false;
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    clicked = "download" in a;
  } catch {
    clicked = false;
  }
  if (!clicked) {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function download(filename: string, content: string, mime: string) {
  downloadBlob(filename, new Blob([content], { type: mime }));
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

/**
 * Export satu pertemuan/page sebagai file PDF yang langsung ke-download —
 * bukan lewat dialog print. Content di-render off-screen (gambar `idb:<id>`
 * diganti data URL base64 dulu lewat collectImagesForPages), di-"foto" pakai
 * html2canvas, lalu potongan gambarnya ditempel ke halaman-halaman jsPDF
 * (dipotong per tinggi halaman kalau kontennya panjang) dan langsung di-save().
 */
export async function exportPagePdf(pageId: string) {
  const data = getData();
  const page = data.pages.find((p) => p.id === pageId && !p.deleted);
  if (!page) return;
  const subject = data.subjects.find((s) => s.id === page.subject_id);
  const images = await collectImagesForPages([page]);

  let content = page.content || "";
  for (const [id, img] of Object.entries(images)) {
    content = content.split(`idb:${id}`).join(`data:${img.contentType};base64,${img.base64}`);
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Render di container off-screen (bukan display:none, biar html2canvas tetap bisa
  // ngukur layout-nya) dengan lebar tetap supaya hasil render konsisten dari sisi manapun.
  const RENDER_WIDTH = 794; // ~ A4 @ 96dpi
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = `${RENDER_WIDTH}px`;
  container.style.background = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.color = "#111111";
  container.innerHTML = `
    <h1 style="font-size:22px;margin:0 0 4px;">${escapeHtml(page.title || "Catatan")}</h1>
    <p style="color:#666;font-size:12px;margin:0 0 24px;">
      ${subject ? `${escapeHtml(subject.name)} · ` : ""}Diekspor ${escapeHtml(new Date().toLocaleString("id-ID"))}
    </p>
    <div style="line-height:1.55;">${content || "<p><em>(kosong)</em></p>"}</div>
  `;
  const images_ = container.querySelectorAll("img");
  images_.forEach((img) => {
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
  });
  document.body.appendChild(container);

  try {
    // Tunggu semua <img> di container selesai load, biar gak ke-capture kosong/putus.
    await Promise.all(
      Array.from(images_).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
      ),
    );

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Kalau kontennya lebih tinggi dari satu halaman, potong canvas jadi beberapa
    // halaman PDF berturut-turut (masing-masing setinggi satu halaman A4).
    const pageHeightOnCanvas = (pageHeight * canvas.width) / imgWidth;
    let renderedHeight = 0;
    let first = true;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightOnCanvas, canvas.height - renderedHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );
      }
      const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
      if (!first) pdf.addPage();
      pdf.addImage(
        sliceCanvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        imgWidth,
        sliceImgHeight,
      );
      renderedHeight += sliceHeight;
      first = false;
    }

    pdf.save(`noteme-${slugify(page.title)}-${stamp()}.pdf`);
  } finally {
    container.remove();
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
