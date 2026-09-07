import { supabase } from "@/integrations/supabase/client";
import { extractLocalImageIds, getData, type Page } from "@/storage/local/dataCore";
import { getImageBlob } from "@/storage/local/imageStore";

export type BackupImage = { contentType: string; base64: string };

export function blobToBase64(blob: Blob): Promise<string> {
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

export function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType || "application/octet-stream" });
}

/**
 * Kumpulin semua gambar `idb:<id>` yang dipakai satu atau beberapa halaman jadi base64,
 * supaya backup JSON tetap utuh & portable walau `content`-nya sendiri tidak diubah
 * (tetap berisi referensi `idb:<id>`, bukan data URL). Diambil dari IndexedDB dulu;
 * kalau gambarnya belum ada lokal (misal baru sync dari device lain) tapi sudah pernah
 * keupload, coba ambil dari Supabase Storage sebagai fallback. Gambar yang gagal
 * diambil dari kedua sumber (jarang terjadi) dilewati saja, tidak menggagalkan export.
 */
export async function collectImagesForPages(pages: Page[]): Promise<Record<string, BackupImage>> {
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

export function download(filename: string, content: string, mime: string) {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

export function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "catatan";
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
