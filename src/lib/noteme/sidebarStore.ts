import { useSyncExternalStore } from "react";

/**
 * State sidebar desktop (dibagi lintas halaman, tiap halaman me-render <Sidebar /> sendiri).
 * Default: mengecil (ikon saja). Baru melebar kalau tombol "perbesar" diklik, dan mengecil lagi
 * begitu user memilih menu / klik di luar sidebar. Sengaja tidak dipersist.
 */
let expanded = false;
const listeners = new Set<() => void>();

export function setSidebarExpanded(next: boolean) {
  if (expanded === next) return;
  expanded = next;
  listeners.forEach((l) => l());
}

export function toggleSidebar() {
  setSidebarExpanded(!expanded);
}

export function useSidebarExpanded(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => expanded,
    () => false,
  );
}
