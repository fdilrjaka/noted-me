import { deleteImage as deleteLocalImage } from "./imageStore";
import { extractLocalImageIds, getData, now, updateData, type Page } from "./dataCore";

// Hapus blob lokal (IndexedDB) buat tiap gambar `idb:` di halaman-halaman yang beneran
// dihapus permanen, dan tandai row NoteImage terkait `deleted: true, dirty: true` biar
// object-nya ikut kehapus dari Supabase Storage lewat sync.ts. Best-effort & async —
// tidak memblokir/menunggu penghapusan lokal selesai (purge/emptyTrash tetap sinkron
// dari sudut pandang caller).
export function purgeImagesForPages(pages: Page[]) {
  const imageIds = new Set<string>();
  for (const page of pages) {
    for (const id of extractLocalImageIds(page.content)) imageIds.add(id);
  }
  if (imageIds.size === 0) return;
  for (const id of imageIds) void deleteLocalImage(id);
  updateData((d) => ({
    ...d,
    images: d.images.map((img) =>
      imageIds.has(img.id) ? { ...img, deleted: true, updated_at: now(), dirty: true } : img,
    ),
  }));
}

// re-exported for convenience where callers need current data snapshot alongside purge
export { getData };
