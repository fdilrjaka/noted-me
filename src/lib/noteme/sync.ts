import { supabase } from "@/integrations/supabase/client";
import { getData, setData, type Data, type NoteImage, type Page, type Subject } from "./store";
import { getImageBlob } from "./imageStore";

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */

function noteImageRow(i: NoteImage, userId: string): Row {
  return {
    id: i.id,
    user_id: userId,
    page_id: i.page_id,
    storage_path: i.storage_path,
    deleted: i.deleted,
    updated_at: i.updated_at,
  };
}

/**
 * Upload blob gambar lokal ke bucket Storage "note-images" (path sama seperti sebelumnya:
 * {user_id}/{page_id}/{id}.ext), balikin storage_path-nya. Dipanggil dari doSync sebelum
 * upsert row `note_images`, cuma buat gambar yang belum punya storage_path.
 */
async function uploadImageBlob(image: NoteImage, blob: Blob, userId: string): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${userId}/${image.page_id}/${image.id}.${ext}`;
  const { error } = await supabase.storage
    .from("note-images")
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

function subjectRow(s: Subject, userId: string): Row {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    color: s.color,
    pinned: s.pinned,
    position: s.position,
    deleted: s.deleted,
    updated_at: s.updated_at,
  };
}

function pageRow(p: Page, userId: string): Row {
  return {
    id: p.id,
    user_id: userId,
    subject_id: p.subject_id,
    title: p.title,
    content: p.content,
    pinned: p.pinned,
    position: p.position,
    deleted: p.deleted,
    updated_at: p.updated_at,
  };
}

function mergeRemote<T extends { id: string; updated_at: string; dirty: boolean }>(
  local: T[],
  remote: Array<Record<string, unknown>>,
  build: (row: Record<string, unknown>) => T,
): T[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const row of remote) {
    const incoming = build(row);
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }
    // Never overwrite un-synced local edits that are newer than the server copy.
    if (existing.dirty && existing.updated_at >= incoming.updated_at) continue;
    byId.set(incoming.id, incoming);
  }
  return [...byId.values()];
}

let running: Promise<void> | null = null;

export function syncNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = doSync(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(userId: string, full: boolean) {
  const before = getData();
  const dirtySubjects = before.subjects.filter((s) => s.dirty);
  const dirtyPages = before.pages.filter((p) => p.dirty);
  const dirtyImages = before.images.filter((i) => i.dirty);

  if (dirtySubjects.length) {
    const { error } = await supabase
      .from("subjects")
      .upsert(dirtySubjects.map((s) => subjectRow(s, userId)) as any);
    if (error) throw error;
  }
  if (dirtyPages.length) {
    const { error } = await supabase
      .from("pages")
      .upsert(dirtyPages.map((p) => pageRow(p, userId)) as any);
    if (error) throw error;
  }

  // Gambar butuh langkah ekstra sebelum upsert row metadatanya: pastikan blob-nya
  // beneran sudah ada di bucket Storage dulu. Row yang gagal disini tetap dirty dan
  // akan dicoba lagi di sync berikutnya — tidak melempar error yang membatalkan
  // seluruh sync (biar teks tetap kesync walau satu-dua gambar lagi bermasalah).
  const imagesToUpsert: NoteImage[] = [];
  const skippedImageIds = new Set<string>();
  for (const image of dirtyImages) {
    if (image.deleted) {
      if (image.storage_path) {
        const { error } = await supabase.storage.from("note-images").remove([image.storage_path]);
        // Best-effort — kalau hapus dari Storage gagal, tetap lanjut upsert row
        // `deleted: true` supaya device lain berhenti nampilin gambar ini.
        if (error) console.error("gagal hapus gambar dari storage", error);
      }
      imagesToUpsert.push(image);
      continue;
    }
    if (image.storage_path) {
      imagesToUpsert.push(image);
      continue;
    }
    // storage_path masih null → belum pernah keupload, coba upload dari blob lokal.
    const blob = await getImageBlob(image.id);
    if (!blob) {
      // Blob lokal gak ada (kasus aneh/corrupt) — skip, biarkan tetap dirty.
      skippedImageIds.add(image.id);
      continue;
    }
    try {
      const path = await uploadImageBlob(image, blob, userId);
      imagesToUpsert.push({ ...image, storage_path: path });
    } catch (err) {
      console.error("gagal upload gambar", err);
      skippedImageIds.add(image.id);
    }
  }
  if (imagesToUpsert.length) {
    const { error } = await supabase
      .from("note_images")
      .upsert(imagesToUpsert.map((i) => noteImageRow(i, userId)) as any);
    if (error) throw error;
  }

  const pushedSubjects = new Map(dirtySubjects.map((s) => [s.id, s.updated_at]));
  const pushedPages = new Map(dirtyPages.map((p) => [p.id, p.updated_at]));
  const pushedImages = new Map(imagesToUpsert.map((i) => [i.id, i.storage_path]));

  const since = full ? "1970-01-01T00:00:00.000Z" : (before.lastPull ?? "1970-01-01T00:00:00.000Z");

  const [subjectsRes, pagesRes, imagesRes] = await Promise.all([
    supabase.from("subjects").select("*").gt("updated_at", since),
    supabase.from("pages").select("*").gt("updated_at", since),
    supabase.from("note_images").select("*").gt("updated_at", since),
  ]);
  if (subjectsRes.error) throw subjectsRes.error;
  if (pagesRes.error) throw pagesRes.error;
  if (imagesRes.error) throw imagesRes.error;

  const current = getData();
  // Clear dirty flags only for rows unchanged since we pushed them.
  const subjects = current.subjects.map((s) =>
    pushedSubjects.get(s.id) === s.updated_at ? { ...s, dirty: false } : s,
  );
  const pages = current.pages.map((p) =>
    pushedPages.get(p.id) === p.updated_at ? { ...p, dirty: false } : p,
  );
  const images = current.images.map((i) =>
    pushedImages.has(i.id) && !skippedImageIds.has(i.id)
      ? { ...i, storage_path: pushedImages.get(i.id) ?? i.storage_path, dirty: false }
      : i,
  );

  const next: Data = {
    subjects: mergeRemote(subjects, subjectsRes.data ?? [], (row) => ({
      id: String(row["id"]),
      name: String(row["name"] ?? ""),
      color: String(row["color"] ?? "blue"),
      pinned: Boolean(row["pinned"]),
      position: Number(row["position"] ?? 0),
      deleted: Boolean(row["deleted"]),
      updated_at: new Date(String(row["updated_at"])).toISOString(),
      dirty: false,
    })),
    pages: mergeRemote(pages, pagesRes.data ?? [], (row) => ({
      id: String(row["id"]),
      subject_id: String(row["subject_id"]),
      title: String(row["title"] ?? ""),
      content: String(row["content"] ?? ""),
      pinned: Boolean(row["pinned"]),
      position: Number(row["position"] ?? 0),
      deleted: Boolean(row["deleted"]),
      updated_at: new Date(String(row["updated_at"])).toISOString(),
      dirty: false,
    })),
    images: mergeRemote(images, imagesRes.data ?? [], (row) => ({
      id: String(row["id"]),
      page_id: String(row["page_id"]),
      storage_path: row["storage_path"] == null ? null : String(row["storage_path"]),
      deleted: Boolean(row["deleted"]),
      updated_at: new Date(String(row["updated_at"])).toISOString(),
      dirty: false,
    })),
    lastPull: new Date(Date.now() - 5000).toISOString(),
  };

  setData(next);
}
