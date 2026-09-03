// Satu tempat untuk ubah "idb:<id>" (skema src yang dipakai <img> di editor & gallery)
// jadi object URL blob yang bisa dipasang langsung ke <img src>. Sumbernya bisa dari
// IndexedDB lokal (imageStore) atau, kalau belum ada lokal, download on-demand dari
// Supabase Storage (untuk gambar hasil sync dari device lain) lalu di-cache lokal.
import { supabase } from "@/integrations/supabase/client";
import { getImageBlob, putImage } from "./imageStore";
import { getData } from "./store";

// Cache in-memory object URL per id, supaya createObjectURL gak dipanggil berkali-kali
// untuk id yang sama dalam satu sesi — createObjectURL yang menumpuk tanpa di-revoke
// adalah memory leak.
const resolvedCache = new Map<string, string>();

// Cegah beberapa caller minta resolve id yang sama secara bersamaan (misal render ulang
// beberapa <img> sekaligus saat buka halaman) memicu beberapa download/putImage paralel.
const inFlight = new Map<string, Promise<string | null>>();

async function resolveUncached(id: string): Promise<string | null> {
  // 1. Coba dari IndexedDB lokal dulu.
  const localBlob = await getImageBlob(id);
  if (localBlob) {
    const url = URL.createObjectURL(localBlob);
    resolvedCache.set(id, url);
    return url;
  }

  // 2. Gak ada lokal — cek metadata note_images, kalau sudah pernah keupload dari
  //    device manapun, download dari Supabase Storage lalu cache-in ke IndexedDB
  //    pakai id yang sama (supaya kali berikutnya sudah lokal).
  //    Bucket "note-images" bersifat PRIVAT (RLS: folder harus = auth.uid()), jadi
  //    HARUS didownload lewat client Supabase yang authenticated (.download()) —
  //    getPublicUrl() + fetch() biasa gak bawa token & bakal selalu gagal/ditolak RLS.
  const meta = getData().images.find((img) => img.id === id && !img.deleted);
  if (meta?.storage_path) {
    try {
      const { data: blob, error } = await supabase.storage
        .from("note-images")
        .download(meta.storage_path);
      if (!error && blob) {
        await putImage(blob, meta.page_id, { id });
        const url = URL.createObjectURL(blob);
        resolvedCache.set(id, url);
        return url;
      }
      if (error) console.error("gagal download gambar dari storage", error);
    } catch (err) {
      console.error("gagal download gambar dari storage", err);
    }
  }

  // 3. Row note_images-nya sendiri belum ada (baru saja disync, race condition) atau
  //    download gagal — caller yang tampilkan placeholder & retry belakangan.
  return null;
}

export async function resolveImageSrc(id: string): Promise<string | null> {
  const cached = resolvedCache.get(id);
  if (cached) return cached;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const promise = resolveUncached(id).finally(() => {
    inFlight.delete(id);
  });
  inFlight.set(id, promise);
  return promise;
}

export function revokeAllResolved(): void {
  for (const url of resolvedCache.values()) {
    URL.revokeObjectURL(url);
  }
  resolvedCache.clear();
}
