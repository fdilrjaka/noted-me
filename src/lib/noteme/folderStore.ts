import { useSyncExternalStore } from "react";

/**
 * Folder saat ini masih "pajangan" — cuma tampil di grid dashboard, belum
 * bisa dibuka/diisi catatan, dan sengaja TIDAK ikut skema sync Subject/Page
 * di store.ts (biar tidak menyentuh kontrak data yang sudah disinkron ke
 * Supabase). Kalau nanti folder mau benar-benar fungsional, pindahkan ke
 * store.ts dan desain migrasinya di sana.
 */
export type Folder = {
  id: string;
  name: string;
  createdAt: string;
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
    // Placeholder feature — gagal simpan folder tidak perlu mengganggu user dengan toast.
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
    if (raw) folders = (JSON.parse(raw) as Folder[]) ?? [];
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
  const folder: Folder = { id: uid(), name: name.trim(), createdAt: new Date().toISOString() };
  folders = [folder, ...folders];
  persist();
  emit();
  return folder;
}
