import { supabase } from "@/integrations/supabase/client";
import type { NoteImage } from "@/storage/local/dataCore";

/**
 * Upload blob gambar lokal ke bucket Storage "note-images" (path sama seperti sebelumnya:
 * {user_id}/{page_id}/{id}.ext), balikin storage_path-nya. Dipanggil dari sync engine sebelum
 * upsert row `note_images`, cuma buat gambar yang belum punya storage_path.
 */
export async function uploadImageBlob(
  image: NoteImage,
  blob: Blob,
  userId: string,
): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${image.page_id}/${image.id}.${ext}`;
  const { error } = await supabase.storage
    .from("note-images")
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  return path;
}
