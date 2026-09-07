/**
 * Baseline: `updated_at` terakhir yang KITA tahu sudah sama antara lokal & server buat
 * tiap page. Dipakai buat bedain "remote beneran berubah dari device lain" vs "remote
 * cuma gaung dari push kita sendiri" — soalnya `since` sengaja mundur 5 detik (lihat
 * syncNow.ts) biar gak ada race yang kelewat, dan itu bikin push kita sendiri ikut kepull
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

export function getSyncedVersion(pageId: string): string | undefined {
  return syncedPageVersions.get(pageId);
}

export function persistSyncedVersions() {
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

export function markPageSynced(id: string, updatedAt: string) {
  syncedPageVersions.set(id, updatedAt);
}
