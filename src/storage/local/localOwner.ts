import { clearLocal, hasLocalNotes, loadLocal } from "@/storage/local/dataCore";
import { clearAllImages } from "@/storage/local/imageStore";
import { clearSyncedVersions } from "@/storage/remote/versionTracker";
import { setConflicts } from "@/storage/remote/conflictResolver";
import { revokeAllResolved } from "@/lib/noteme/imageResolver";
import { clearFolders } from "@/lib/noteme/folderStore";
import { clearScheduleLocal, getScheduleData, loadScheduleLocal } from "@/lib/noteme/scheduleStore";
import { clearTodoLocal, getTodoData, loadTodoLocal } from "@/lib/noteme/todoStore";

/**
 * Pemilik data lokal.
 *
 * Catatan sengaja tetap ada di perangkat setelah logout (mode offline-first). Akibatnya, kalau
 * akun LAIN login di perangkat yang sama, tanpa penjagaan ini: (1) catatan akun lama tampil di
 * akun baru, dan (2) semua baris yang belum tersinkron ikut di-push ke akun baru — data satu
 * orang bocor ke akun orang lain.
 *
 * Solusi: simpan id akun pemilik data lokal. Saat sync mau jalan untuk akun X:
 *  - pemilik belum tercatat -> data itu dibuat sebagai tamu / sebelum penjagaan ini ada,
 *    dianggap milik X dan dicatat (perilaku lama: catatan tamu ikut masuk ke akun);
 *  - pemilik = X -> lanjut;
 *  - pemilik akun lain -> data lokal dibuang total (catatan, todo, jadwal, folder, gambar,
 *    baseline versi, konflik) sebelum apa pun di-push atau di-pull.
 */
const OWNER_KEY = "noteme.owner.v1";

function readOwner(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // Best-effort — kalau gagal, pemeriksaan berikutnya menganggap data ini milik tamu.
  }
}

function loadAllLocal() {
  loadLocal();
  loadTodoLocal();
  loadScheduleLocal();
}

/** True kalau perangkat ini menyimpan data milik akun LAIN yang akan terhapus bila `userId` login. */
export function localDataBelongsToOther(userId: string): boolean {
  loadAllLocal();
  const owner = readOwner();
  if (!owner || owner === userId) return false;
  const todo = getTodoData();
  return (
    hasLocalNotes() ||
    todo.sections.length > 0 ||
    todo.tasks.length > 0 ||
    getScheduleData().classes.length > 0
  );
}

let inflight: Promise<void> | null = null;

/** Panggil SEBELUM sync apa pun untuk `userId`. Idempoten; panggilan bersamaan berbagi satu proses. */
export function ensureLocalOwner(userId: string): Promise<void> {
  if (inflight) return inflight;
  inflight = doEnsure(userId).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doEnsure(userId: string): Promise<void> {
  loadAllLocal();
  const owner = readOwner();
  if (owner === userId) return;
  if (owner === null) {
    writeOwner(userId);
    return;
  }

  // Data akun lain. Bagian localStorage dibuang sinkron dulu, baru IndexedDB (async).
  setConflicts([]);
  clearLocal();
  clearTodoLocal();
  clearScheduleLocal();
  clearFolders();
  clearSyncedVersions();
  revokeAllResolved();
  writeOwner(userId);
  await clearAllImages();
}
