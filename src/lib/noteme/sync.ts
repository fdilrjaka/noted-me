import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getData, setData, stripHtml, type Data, type NoteImage, type Page, type Subject } from "./store";
import { getImageBlob } from "./imageStore";

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Konflik edit: page yang masih dirty (edit lokal belum ke-push) tapi versi di
 * server sudah berubah duluan (device lain sempat sync duluan). Bukannya diam-diam
 * milih salah satu (last-write-wins), kita nahan dulu row ini — gak di-push, gak
 * ditimpa remote — dan taruh di sini biar UI bisa nanya user mau "timpa" atau "gabung".
 */
export type PageConflict = {
  id: string;
  local: Page;
  remote: Page;
};

let pendingConflicts: PageConflict[] = [];
const conflictListeners = new Set<() => void>();

function emitConflicts() {
  conflictListeners.forEach((l) => l());
}

function setConflicts(next: PageConflict[]) {
  pendingConflicts = next;
  emitConflicts();
}

/** Gabungin konflik baru ke daftar yang sudah ada (replace kalau id sama). */
function upsertConflicts(newOnes: PageConflict[]) {
  if (!newOnes.length) return;
  const byId = new Map(pendingConflicts.map((c) => [c.id, c]));
  for (const c of newOnes) byId.set(c.id, c);
  setConflicts([...byId.values()]);
}

export function getConflicts(): PageConflict[] {
  return pendingConflicts;
}

export function useConflicts(): PageConflict[] {
  return useSyncExternalStore(
    (cb) => {
      conflictListeners.add(cb);
      return () => conflictListeners.delete(cb);
    },
    () => pendingConflicts,
    () => [],
  );
}

function buildPage(row: Row): Page {
  return {
    id: String(row["id"]),
    subject_id: String(row["subject_id"]),
    title: String(row["title"] ?? ""),
    content: String(row["content"] ?? ""),
    pinned: Boolean(row["pinned"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

/**
 * Baseline: `updated_at` terakhir yang KITA tahu sudah sama antara lokal & server buat
 * tiap page. Dipakai buat bedain "remote beneran berubah dari device lain" vs "remote
 * cuma gaung dari push kita sendiri" — soalnya `since` sengaja mundur 5 detik (lihat
 * doSync) biar gak ada race yang kelewat, dan itu bikin push kita sendiri ikut kepull
 * lagi di sync berikutnya. Tanpa baseline ini, gaung itu keliatan kayak "device lain
 * baru aja ngedit", padahal itu ya kita sendiri — makanya dialog konflik muncul padahal
 * cuma satu device yang ngetik.
 * Disimpan ke localStorage juga supaya tetap kepakai walau tab di-refresh.
 */
const SYNCED_VERSIONS_KEY = "noteme.syncedAt.v1";

function loadSyncedVersions(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(SYNCED_VERSIONS_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

const syncedPageVersions = loadSyncedVersions();

function persistSyncedVersions() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SYNCED_VERSIONS_KEY,
      JSON.stringify(Object.fromEntries(syncedPageVersions)),
    );
  } catch {
    // Best-effort — kalau gagal simpan, paling banter deteksi konflik agak kurang
    // presisi setelah reload, gak sampai kehilangan data.
  }
}

function markPageSynced(id: string, updatedAt: string) {
  syncedPageVersions.set(id, updatedAt);
}

function mergePageContent(local: Page, remote: Page): string {
  if (local.content.trim() === remote.content.trim()) return local.content;
  return (
    `<p><strong>— Versi dari perangkat lain —</strong></p>` +
    remote.content +
    `<p><strong>— Versi dari perangkat ini —</strong></p>` +
    local.content
  );
}

const DIFF_WORD_LIMIT = 4000; // batas kata per sisi biar DP diff-nya gak berat di note yang kepanjangan
const DIFF_PHRASE_LIMIT = 4; // maksimal berapa potongan beda yang ditampilin per sisi
const DIFF_PHRASE_MAX_CHARS = 90; // potong tampilannya kalau kepanjangan

/**
 * Diff kata sederhana (berbasis LCS) buat nunjukin bagian mana yang bener-bener beda
 * di dua versi note, biar dialog konflik gak cuma bilang "beda" doang tapi nunjukin
 * kata/kalimatnya. "removed" = potongan yang cuma ada di versi lokal, "added" = yang
 * cuma ada di versi lain.
 */
export function diffPageContent(
  local: Page,
  remote: Page,
): { removed: string[]; added: string[]; truncated: boolean } {
  const a = stripHtml(local.content).split(" ").filter(Boolean);
  const b = stripHtml(remote.content).split(" ").filter(Boolean);

  if (a.length > DIFF_WORD_LIMIT || b.length > DIFF_WORD_LIMIT) {
    return { removed: [], added: [], truncated: true };
  }

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const removed: string[] = [];
  const added: string[] = [];
  let removedRun: string[] = [];
  let addedRun: string[] = [];
  const flush = () => {
    if (removedRun.length) {
      removed.push(removedRun.join(" "));
      removedRun = [];
    }
    if (addedRun.length) {
      added.push(addedRun.join(" "));
      addedRun = [];
    }
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      removedRun.push(a[i]);
      i++;
    } else {
      addedRun.push(b[j]);
      j++;
    }
  }
  while (i < n) {
    removedRun.push(a[i]);
    i++;
  }
  while (j < m) {
    addedRun.push(b[j]);
    j++;
  }
  flush();

  const truncatePhrase = (s: string) => (s.length > DIFF_PHRASE_MAX_CHARS ? `${s.slice(0, DIFF_PHRASE_MAX_CHARS)}…` : s);

  return {
    removed: removed.slice(0, DIFF_PHRASE_LIMIT).map(truncatePhrase),
    added: added.slice(0, DIFF_PHRASE_LIMIT).map(truncatePhrase),
    truncated: false,
  };
}

/**
 * Dipanggil dari dialog konflik. "overwrite" = buang edit lokal, pakai versi
 * server. "merge" = gabungin dua-duanya jadi satu note (gak ada yang hilang),
 * ditandai dirty lagi supaya ke-push balik ke server di sync berikutnya.
 */
export function resolveConflict(id: string, choice: "overwrite" | "merge") {
  const conflict = pendingConflicts.find((c) => c.id === id);
  if (!conflict) return;
  setConflicts(pendingConflicts.filter((c) => c.id !== id));

  const current = getData();
  const pages = current.pages.map((p) => {
    if (p.id !== id) return p;
    if (choice === "overwrite") {
      markPageSynced(id, conflict.remote.updated_at);
      return { ...conflict.remote, dirty: false };
    }
    return {
      ...conflict.local,
      content: mergePageContent(conflict.local, conflict.remote),
      updated_at: new Date().toISOString(),
      dirty: true,
    };
  });
  persistSyncedVersions();
  setData({ ...current, pages });
}

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
  const remotePagesById = new Map((pagesRes.data ?? []).map((r) => [String((r as Row)["id"]), r as Row]));
  const conflictIds = new Set<string>();
  const newConflicts: PageConflict[] = [];
  for (const local of dirtyPages) {
    const row = remotePagesById.get(local.id);
    if (!row) continue;
    const remote = buildPage(row);
    if (remote.updated_at === local.updated_at) continue;
    // Remote persis sama dengan versi yang KITA sendiri terakhir push berhasil →
    // itu cuma gaung dari overlap window `since`, bukan edit dari device lain.
    if (remote.updated_at === syncedPageVersions.get(local.id)) continue;
    conflictIds.add(local.id);
    newConflicts.push({ id: local.id, local, remote });
  }
  upsertConflicts(newConflicts);
  // Konflik yang sebelumnya pending tapi ternyata sudah gak dirty lagi lokal (mis. sudah
  // diresolve dari device/tab lain) gak perlu terus nyangkut di daftar.
  if (pendingConflicts.length) {
    const stillDirty = new Set(dirtyPages.map((p) => p.id));
    setConflicts(pendingConflicts.filter((c) => stillDirty.has(c.id)));
  }

  const pushableSubjects = dirtySubjects;
  const pushablePages = dirtyPages.filter((p) => !conflictIds.has(p.id));

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
