import { useSyncExternalStore } from "react";
import { getData, setData, stripHtml, type Page } from "@/storage/local/dataCore";
import { markPageSynced, persistSyncedVersions } from "./versionTracker";

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

export function setConflicts(next: PageConflict[]) {
  pendingConflicts = next;
  emitConflicts();
}

/** Gabungin konflik baru ke daftar yang sudah ada (replace kalau id sama). */
export function upsertConflicts(newOnes: PageConflict[]) {
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

/** Cek apakah `needle` (secara isi teks, bukan HTML mentah) udah ada di dalam `haystack`. */
function contentIncludes(haystack: string, needle: string): boolean {
  const n = stripHtml(needle).trim();
  if (!n) return true;
  const h = stripHtml(haystack).trim();
  return h.includes(n);
}

export function mergePageContent(local: Page, remote: Page): string {
  if (local.content.trim() === remote.content.trim()) return local.content;

  // Kalau salah satu versi udah nyakup penuh isi versi lainnya — misalnya karena
  // ini bukan konflik baru, tapi echo dari hasil "gabung" sebelumnya yang balik
  // lagi lewat sync — jangan digabung ulang. Dulu ini gak dicek, jadi tiap kali
  // conflict muncul lagi (walau isinya sebenernya udah pernah digabung), header
  // "— Versi dari perangkat lain/ini —" dan seluruh isinya numpuk lagi di atas
  // hasil gabungan sebelumnya, bikin catatan keulang-ulang makin panjang.
  if (contentIncludes(local.content, remote.content)) return local.content;
  if (contentIncludes(remote.content, local.content)) return remote.content;

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
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
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
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      removedRun.push(a[i]!);
      i++;
    } else {
      addedRun.push(b[j]!);
      j++;
    }
  }
  while (i < n) {
    removedRun.push(a[i]!);
    i++;
  }
  while (j < m) {
    addedRun.push(b[j]!);
    j++;
  }
  flush();

  const truncatePhrase = (s: string) =>
    s.length > DIFF_PHRASE_MAX_CHARS ? `${s.slice(0, DIFF_PHRASE_MAX_CHARS)}…` : s;

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
      editedOffline: false,
    };
  });
  persistSyncedVersions();
  setData({ ...current, pages });
}
