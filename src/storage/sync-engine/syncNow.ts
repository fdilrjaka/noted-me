import { supabase } from "@/integrations/supabase/client";
import { getData, setData, type Data, type Page } from "@/storage/local/dataCore";
import { getImageBlob } from "@/storage/local/imageStore";
import {
  buildPage,
  noteImageRow,
  subjectRow,
  pageRow,
  type Row,
} from "@/storage/remote/rowMappers";
import { uploadImageBlob } from "@/storage/remote/imageSync";
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
  mergePageContent,
} from "@/storage/remote/conflictResolver";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const since = full ? "1970-01-01T00:00:00.000Z" : (before.lastPull ?? "1970-01-01T00:00:00.000Z");

  // Pull duluan SEBELUM push, supaya kita bisa lihat apakah row yang mau kita push
  // ternyata sudah diubah duluan sama device lain sejak terakhir kita sync.
  const [subjectsRes, pagesRes, imagesRes] = await Promise.all([
    supabase.from("subjects").select("*").gt("updated_at", since),
    supabase.from("pages").select("*").gt("updated_at", since),
    supabase.from("note_images").select("*").gt("updated_at", since),
  ]);
  if (subjectsRes.error) throw subjectsRes.error;
  if (pagesRes.error) throw pagesRes.error;
  if (imagesRes.error) throw imagesRes.error;

  const dirtySubjects = before.subjects.filter((s) => s.dirty);
  const dirtyPages = before.pages.filter((p) => p.dirty);
  const dirtyImages = before.images.filter((i) => i.dirty);

  // Deteksi konflik: page masih dirty (edit lokal belum ke-push) TAPI baris yang sama
  // di server juga sudah berubah (updated_at beda) sejak terakhir kita pull — berarti
  // diedit di device lain. Row ini gak boleh di-push atau ditimpa diam-diam; tahan dulu
  // dan biarin dialog konflik yang nentuin (timpa/gabung), bukan last-write-wins.
  const remotePagesById = new Map(
    (pagesRes.data ?? []).map((r) => [String((r as Row)["id"]), r as Row]),
  );
  const conflictIds = new Set<string>();
  const newConflicts: PageConflict[] = [];
  // Konflik yang ketemu saat KEDUA sisi sempat online terus (bukan hasil edit offline) —
  // ini kasus normal "dua device lagi ngetik bareng". Gak perlu nanya user tiap kali;
  // otomatis digabung (setelan pabrik) biar live-typing gak keganggu dialog tiap beberapa
  // detik. `editedOffline` cuma nyala kalau edit lokal itu sempat kesentuh saat offline —
  // di situ kita gak yakin versi mana yang paling "lengkap", jadi tetap tanya lewat dialog.
  const autoMerged = new Map<string, Page>();
  for (const local of dirtyPages) {
    const row = remotePagesById.get(local.id);
    if (!row) continue;
    const remote = buildPage(row);
    if (remote.updated_at === local.updated_at) continue;
    // Remote persis sama dengan versi yang KITA sendiri terakhir push berhasil →
    // itu cuma gaung dari overlap window `since`, bukan edit dari device lain.
    if (remote.updated_at === getSyncedVersion(local.id)) continue;
    if (local.editedOffline) {
      conflictIds.add(local.id);
      newConflicts.push({ id: local.id, local, remote });
    } else {
      autoMerged.set(local.id, {
        ...local,
        content: mergePageContent(local, remote),
        updated_at: new Date().toISOString(),
        dirty: true,
        editedOffline: false,
      });
    }
  }
  upsertConflicts(newConflicts);
  // Tulis hasil auto-merge ke store SEKARANG (bukan nanti di akhir fungsi), supaya tidak
  // ketiban balik oleh versi lama pas `current = getData()` dipanggil setelah push di bawah.
  if (autoMerged.size) {
    const cur = getData();
    setData({ ...cur, pages: cur.pages.map((p) => autoMerged.get(p.id) ?? p) });
  }
  // Konflik yang sebelumnya pending tapi ternyata sudah gak dirty lagi lokal (mis. sudah
  // diresolve dari device/tab lain) gak perlu terus nyangkut di daftar.
  if (getConflicts().length) {
    const stillDirty = new Set(dirtyPages.map((p) => p.id));
    setConflicts(getConflicts().filter((c) => stillDirty.has(c.id)));
  }

  const pushableSubjects = dirtySubjects;
  const pushablePages = dirtyPages
    .filter((p) => !conflictIds.has(p.id))
    .map((p) => autoMerged.get(p.id) ?? p);

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
  }

  // Gambar butuh langkah ekstra sebelum upsert row metadatanya: pastikan blob-nya
  // beneran sudah ada di bucket Storage dulu. Row yang gagal disini tetap dirty dan
  // akan dicoba lagi di sync berikutnya — tidak melempar error yang membatalkan
  // seluruh sync (biar teks tetap kesync walau satu-dua gambar lagi bermasalah).
  const imagesToUpsert: typeof before.images = [];
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

  const pushedSubjects = new Map(pushableSubjects.map((s) => [s.id, s.updated_at]));
  const pushedPages = new Map(pushablePages.map((p) => [p.id, p.updated_at]));
  const pushedImages = new Map(imagesToUpsert.map((i) => [i.id, i.storage_path]));

  const current = getData();
  // Clear dirty flags only for rows unchanged since we pushed them. Page-page yang lagi
  // konflik (conflictIds) sengaja gak masuk pushedPages di atas, jadi tetap dirty di sini.
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
    // Baris yang lagi konflik sengaja dibuang dari batch remote di sini, supaya
    // gak diam-diam nimpa versi lokal yang lagi nunggu keputusan user.
    pages: mergeRemote(
      pages,
      (pagesRes.data ?? []).filter((row) => !conflictIds.has(String((row as Row)["id"]))),
      buildPage,
    ),
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

  // Perbarui baseline "udah sama antara lokal & server" buat tiap page yang gak lagi
  // dirty (baik karena baru sukses ke-push, atau baru kepull dari device lain) —
  // ini yang dipakai sync berikutnya buat gak salah kira gaung push sendiri sebagai
  // konflik. Page yang lagi konflik sengaja dilewatin, baseline-nya tetap yang lama.
  for (const p of next.pages) {
    if (!p.dirty) markPageSynced(p.id, p.updated_at);
  }
  persistSyncedVersions();

  setData(next);
}
