import { supabase } from "@/integrations/supabase/client";
import { getData, setData, type Data, type Page } from "@/storage/local/dataCore";
import { getImageBlob } from "@/storage/local/imageStore";
import {
  buildPage,
  noteImageRow,
  subjectRow,
  pageRow,
} from "@/storage/remote/rowMappers";
import { uploadImageBlob } from "@/storage/remote/imageSync";
import { decodeCursor, nextCursor, pullChanges } from "@/storage/remote/pull";
import {
  markPageSynced,
  persistSyncedVersions,
  getSyncedVersion,
} from "@/storage/remote/versionTracker";
import {
  type PageConflict,
  getConflicts,
  setConflicts,
  upsertConflicts,
} from "@/storage/remote/conflictResolver";

/* eslint-disable @typescript-eslint/no-explicit-any */

function sameInstant(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

function isAtLeast(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return a >= b;
  return ta >= tb;
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
    // Jangan pernah menimpa catatan jika lokal masih dirty, atau jika
    // timestamp lokal sudah lebih baru/sama dengan data dari remote.
    if (existing.dirty || isAtLeast(existing.updated_at, incoming.updated_at)) continue;
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
  const since = full ? "1970-01-01T00:00:00.000Z" : decodeCursor(before.lastPull);

  const [subjectsRes, pagesRes, imagesRes] = await Promise.all([
    pullChanges("subjects", since),
    pullChanges("pages", since),
    pullChanges("note_images", since),
  ]);

  const dirtySubjects = before.subjects.filter((s) => s.dirty);
  const dirtyPages = before.pages.filter((p) => p.dirty);
  const dirtyImages = before.images.filter((i) => i.dirty);

  const remotePagesById = new Map(pagesRes.rows.map((r) => [String(r["id"]), r]));
  const conflictIds = new Set<string>();
  const newConflicts: PageConflict[] = [];

  for (const local of dirtyPages) {
    const row = remotePagesById.get(local.id);
    if (!row) continue;
    const remote = buildPage(row);
    if (sameInstant(remote.updated_at, local.updated_at)) continue;

    const synced = getSyncedVersion(local.id);
    if (synced != null && sameInstant(remote.updated_at, synced)) continue;

    // Jika konten lokal sudah mencakup atau identik dengan remote, tidak perlu digabung
    const localContent = local.content.trim();
    const remoteContent = remote.content.trim();
    if (localContent === remoteContent || localContent.includes(remoteContent)) {
      continue;
    }

    // Hindari auto-merge otomatis yang menyisipkan banner duplikasi ke dokumen.
    // Jika benar-benar ada perubahan terpisah dari perangkat lain, tampilkan dialog
    // agar pengguna bisa memilih (Timpa atau Gabung).
    conflictIds.add(local.id);
    newConflicts.push({ id: local.id, local, remote });
  }

  upsertConflicts(newConflicts);

  if (getConflicts().length) {
    const stillDirty = new Set(dirtyPages.map((p) => p.id));
    setConflicts(getConflicts().filter((c) => stillDirty.has(c.id)));
  }

  const pushableSubjects = dirtySubjects;
  const freshPagesById = new Map(getData().pages.map((p) => [p.id, p]));
  const pushablePages = dirtyPages
    .filter((p) => !conflictIds.has(p.id))
    .map((p) => freshPagesById.get(p.id) ?? p);

  if (pushableSubjects.length) {
    const { error } = await supabase
      .from("subjects")
      .upsert(pushableSubjects.map((s) => subjectRow(s, userId)) as any);
    if (error) throw error;
  }
  if (pushablePages.length) {
    const { error } = await supabase
      .from("pages")
      .upsert(pushablePages.map((p) => pageRow(p, userId)) as any);
    if (error) throw error;

    // Perbarui baseline versi yang berhasil di-push saat ini juga
    for (const p of pushablePages) {
      markPageSynced(p.id, p.updated_at);
    }
    persistSyncedVersions();
  }

  const imagesToUpsert: typeof before.images = [];
  const skippedImageIds = new Set<string>();
  for (const image of dirtyImages) {
    if (image.deleted) {
      if (image.storage_path) {
        const { error } = await supabase.storage.from("note-images").remove([image.storage_path]);
        if (error) console.error("gagal hapus gambar dari storage", error);
      }
      imagesToUpsert.push(image);
      continue;
    }
    if (image.storage_path) {
      imagesToUpsert.push(image);
      continue;
    }
    const blob = await getImageBlob(image.id);
    if (!blob) {
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

  const pushedSubjects = new Map(pushableSubjects.map((s) => [s.id, s.updated_at]));
  const pushedPages = new Map(pushablePages.map((p) => [p.id, p.updated_at]));
  const pushedImages = new Map(imagesToUpsert.map((i) => [i.id, i.storage_path]));

  const current = getData();
  const subjects = current.subjects.map((s) => {
    const pushedAt = pushedSubjects.get(s.id);
    return pushedAt != null && sameInstant(pushedAt, s.updated_at) ? { ...s, dirty: false } : s;
  });
  const pages = current.pages.map((p) => {
    const pushedAt = pushedPages.get(p.id);
    return pushedAt != null && sameInstant(pushedAt, p.updated_at) ? { ...p, dirty: false } : p;
  });
  const images = current.images.map((i) =>
    pushedImages.has(i.id) && !skippedImageIds.has(i.id)
      ? { ...i, storage_path: pushedImages.get(i.id) ?? i.storage_path, dirty: false }
      : i,
  );

  const next: Data = {
    subjects: mergeRemote(subjects, subjectsRes.rows, (row) => ({
      id: String(row["id"]),
      name: String(row["name"] ?? ""),
      color: String(row["color"] ?? "blue"),
      pinned: Boolean(row["pinned"]),
      position: Number(row["position"] ?? 0),
      deleted: Boolean(row["deleted"]),
      updated_at: new Date(String(row["updated_at"])).toISOString(),
      dirty: false,
    })),
    // Abaikan baris yang sedang dalam status konflik atau baris yang baru saja berhasil di-push
    pages: mergeRemote(
      pages,
      pagesRes.rows.filter(
        (row) => !conflictIds.has(String(row["id"])) && !pushedPages.has(String(row["id"])),
      ),
      buildPage,
    ),
    images: mergeRemote(images, imagesRes.rows, (row) => ({
      id: String(row["id"]),
      page_id: String(row["page_id"]),
      storage_path: row["storage_path"] == null ? null : String(row["storage_path"]),
      deleted: Boolean(row["deleted"]),
      updated_at: new Date(String(row["updated_at"])).toISOString(),
      dirty: false,
    })),
    lastPull: nextCursor(before.lastPull, [subjectsRes, pagesRes, imagesRes]),
  };

  for (const p of next.pages) {
    if (!p.dirty) markPageSynced(p.id, p.updated_at);
  }
  persistSyncedVersions();

  setData(next);
}
