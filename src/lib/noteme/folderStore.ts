import { useSyncExternalStore } from "react";

/**
 * Folder catatan — sengaja disimpan HANYA di localStorage (TIDAK ikut skema
 * sync Subject/Page di store.ts / Supabase). Tugas folder murni pengelompokan
 * visual di dashboard: dia cuma menyimpan daftar subjectId yang jadi
 * anggotanya. Card & link tiap mata kuliah tetap dari store.ts seperti biasa,
 * folder tidak menyalin atau mengubah datanya sama sekali.
 */
export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  subjectIds: string[];
};

const KEY = "noteme.folders.v1";

let folders: Folder[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(folders));
  } catch {
    // Fitur lokal — gagal simpan folder tidak perlu mengganggu user dengan toast.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function loadLocal() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) as Partial<Folder>[]) ?? [];
      folders = parsed.map((f) => ({
        id: f.id ?? uid(),
        name: f.name ?? "",
        createdAt: f.createdAt ?? new Date().toISOString(),
        subjectIds: Array.isArray(f.subjectIds) ? f.subjectIds : [],
      }));
    }
  } catch {
    folders = [];
  }
}

export function useFolders(): Folder[] {
  loadLocal();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => folders,
    () => [] as Folder[],
  );
}

export function createFolder(name: string) {
  loadLocal();
  const folder: Folder = {
    id: uid(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    subjectIds: [],
  };
  folders = [folder, ...folders];
  persist();
  emit();
  return folder;
}

/** Hapus folder. Semua subjectId anggotanya otomatis "terlempar" balik ke
 * dashboard utama karena mereka memang tidak pernah dipindah/disalin —
 * folder cuma berhenti menyimpan referensinya. */
export function deleteFolder(folderId: string) {
  loadLocal();
  folders = folders.filter((f) => f.id !== folderId);
  persist();
  emit();
}

export function renameFolder(folderId: string, name: string) {
  loadLocal();
  const trimmed = name.trim();
  if (!trimmed) return;
  folders = folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f));
  persist();
  emit();
}

/** Pindahkan satu catatan (subject) ke folder tertentu. Otomatis dikeluarkan
 * dulu dari folder lain kalau ada, supaya tiap catatan cuma di satu folder. */
export function assignSubjectToFolder(subjectId: string, folderId: string) {
  loadLocal();
  folders = folders.map((f) => {
    if (f.id === folderId) {
      if (f.subjectIds.includes(subjectId)) return f;
      return { ...f, subjectIds: [...f.subjectIds, subjectId] };
    }
    if (f.subjectIds.includes(subjectId)) {
      return { ...f, subjectIds: f.subjectIds.filter((id) => id !== subjectId) };
    }
    return f;
  });
  persist();
  emit();
}

/** Keluarkan satu catatan dari folder manapun ia berada, kembali ke dashboard utama. */
export function removeSubjectFromFolder(subjectId: string) {
  loadLocal();
  folders = folders.map((f) =>
    f.subjectIds.includes(subjectId)
      ? { ...f, subjectIds: f.subjectIds.filter((id) => id !== subjectId) }
      : f,
  );
  persist();
  emit();
}

export function getFolderIdForSubject(subjectId: string): string | null {
  loadLocal();
  return folders.find((f) => f.subjectIds.includes(subjectId))?.id ?? null;
}

export function allFolderedSubjectIds(): Set<string> {
  loadLocal();
  const set = new Set<string>();
  folders.forEach((f) => f.subjectIds.forEach((id) => set.add(id)));
  return set;
}
