import { now, updateData, type NoteImage } from "./dataCore";

/**
 * Dipanggil setelah `imageStore.putImage` berhasil nyimpen blob baru secara lokal —
 * bikin row metadata `NoteImage` yang dirty, biar sync engine tahu ada gambar baru yang
 * perlu diupload ke Supabase Storage begitu online.
 */
export function registerLocalImage(id: string, pageId: string) {
  const image: NoteImage = {
    id,
    page_id: pageId,
    storage_path: null,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  updateData((d) => ({ ...d, images: [...d.images, image] }));
}

/** Dipanggil sync engine setelah blob sukses keupload ke Storage. */
export function markImageUploaded(id: string, storagePath: string) {
  updateData((d) => ({
    ...d,
    images: d.images.map((img) =>
      img.id === id ? { ...img, storage_path: storagePath, updated_at: now(), dirty: true } : img,
    ),
  }));
}

/** Catat row metadata gambar yang datang dari sync (device lain) tapi belum pernah tercatat lokal — dipakai imageResolver saat lazy-download. */
export function upsertImageMeta(image: NoteImage) {
  updateData((d) => {
    const exists = d.images.some((img) => img.id === image.id);
    return {
      ...d,
      images: exists
        ? d.images.map((img) => (img.id === image.id ? image : img))
        : [...d.images, image],
    };
  });
}
