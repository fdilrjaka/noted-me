import { extractLocalImageIds, getData, setData, uid, type NoteImage, type Page, type Subject } from "@/storage/local/dataCore";
import { putImage } from "@/storage/local/imageStore";
import { base64ToBlob, type BackupImage } from "./shared";

type BackupPayload = {
  app?: string;
  subjects?: Array<Record<string, unknown>>;
  pages?: Array<Record<string, unknown>>;
  images?: Record<string, BackupImage>;
};

/**
 * Pulihin file cadangan JSON (hasil exportBackupJson) sebagai mata kuliah & catatan BARU.
 * Sengaja dikasih id baru semua, bukan nimpa yang lama/yang ada di server — supaya:
 *  - gak bentrok sama data yang mungkin udah ada di akun ini (nama mata kuliah boleh sama),
 *  - gak dianggap "konflik sync" ketika ketemu versi lain di server (lihat storage/sync-engine),
 *  - aman dijalanin berkali-kali — worst case cuma keduplikat, gampang dihapus manual.
 * Hasilnya otomatis ke-sync ke server lewat alur normal (semua ditandai dirty).
 */
export async function importBackupJson(
  file: File,
): Promise<{ subjects: number; pages: number; images: number }> {
  let raw: BackupPayload;
  try {
    raw = JSON.parse(await file.text()) as BackupPayload;
  } catch {
    throw new Error("File rusak atau bukan format JSON");
  }
  if (raw.app !== "noteme" || !Array.isArray(raw.subjects) || !Array.isArray(raw.pages)) {
    throw new Error("File ini bukan cadangan NoteMe yang valid");
  }

  const nowIso = new Date().toISOString();
  const data = getData();
  const positionBase = data.subjects.reduce((max, s) => Math.max(max, s.position), 0);

  const subjectIdMap = new Map<string, string>();
  const newSubjects: Subject[] = raw.subjects.map((row, idx) => {
    const newId = uid();
    subjectIdMap.set(String(row["id"]), newId);
    return {
      id: newId,
      name: String(row["name"] ?? "Mata Kuliah"),
      color: String(row["color"] ?? "blue"),
      pinned: false,
      position: positionBase + idx + 1,
      deleted: false,
      updated_at: nowIso,
      dirty: true,
    };
  });

  const newPages: Page[] = [];
  const newImages: NoteImage[] = [];
  let importedImageCount = 0;

  for (const row of raw.pages) {
    const newSubjectId = subjectIdMap.get(String(row["subject_id"]));
    if (!newSubjectId) continue; // halaman punya subject yang gak ada di file, lewatin
    const newPageId = uid();
    let content = String(row["content"] ?? "");

    for (const oldImageId of extractLocalImageIds(content)) {
      const img = raw.images?.[oldImageId];
      if (!img) continue;
      try {
        const blob = base64ToBlob(img.base64, img.contentType);
        const newImageId = await putImage(blob, newPageId);
        content = content.split(`idb:${oldImageId}`).join(`idb:${newImageId}`);
        newImages.push({
          id: newImageId,
          page_id: newPageId,
          storage_path: null,
          deleted: false,
          updated_at: nowIso,
          dirty: true,
        });
        importedImageCount++;
      } catch {
        // Gambar ini gagal didekode/disimpan — dilewatin aja, sisa importnya tetap lanjut.
      }
    }

    newPages.push({
      id: newPageId,
      subject_id: newSubjectId,
      title: String(row["title"] ?? "Tanpa judul"),
      content,
      pinned: false,
      position: Number(row["position"] ?? 0),
      deleted: false,
      updated_at: nowIso,
      dirty: true,
      editedOffline: false,
    });
  }

  setData({
    ...data,
    subjects: [...data.subjects, ...newSubjects],
    pages: [...data.pages, ...newPages],
    images: [...data.images, ...newImages],
  });

  return { subjects: newSubjects.length, pages: newPages.length, images: importedImageCount };
}
