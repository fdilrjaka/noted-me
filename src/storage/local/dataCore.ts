import { useSyncExternalStore } from "react";
import { toast } from "sonner";

/**
 * dataCore.ts — mesin data inti (single source of truth di localStorage).
 *
 * File ini SENGAJA jadi satu-satunya tempat yang pegang variabel `data` module-level
 * dan fungsi persist/emit-nya. subjectStore.ts, pageStore.ts, dan imageMetaStore.ts
 * semua nyambung ke sini lewat `getData()` / `updateData()` — bukan punya salinan state
 * sendiri-sendiri. Ini penting: kalau tiap file punya `data` sendiri, perubahan di satu
 * file gak bakal keliatan di file lain (bug klasik "kenapa gak sinkron").
 */

export type Subject = {
  id: string;
  name: string;
  color: string;
  pinned: boolean;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
};

export type Page = {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
  // Nyala kalau ADA bagian dari edit yang belum ke-push ini terjadi saat perangkat offline.
  // Dipakai sync.ts buat mutusin: kalau konflik ketemu dan flag ini nyala, kita gak yakin
  // versi mana yang "menang" (bisa jadi ketinggalan banyak perubahan lain selama offline),
  // jadi tetap tanya user lewat dialog. Kalau flag ini mati (edit terjadi waktu online terus,
  // biasa terjadi pas dua device sama-sama lagi ngetik live), konflik digabung otomatis tanpa
  // nanya — biar pengalaman ngetik bareng gak keganggu dialog tiap beberapa detik.
  editedOffline: boolean;
};

// Metadata gambar/tulisan tangan — bukan blob-nya (blob ada di IndexedDB via imageStore.ts).
// Dipakai buat nyinkronin status "sudah ke-backup ke Supabase Storage atau belum" dengan
// device lain, pakai pola dirty-flag yang sama kayak Subject/Page.
export type NoteImage = {
  id: string;
  page_id: string;
  storage_path: string | null;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
};

export type Data = {
  subjects: Subject[];
  pages: Page[];
  images: NoteImage[];
  lastPull: string | null;
};

const KEY = "noteme.data.v1";

export const SUBJECT_COLORS = ["blue", "purple", "pink", "teal", "amber"] as const;

const EMPTY: Data = { subjects: [], pages: [], images: [], lastPull: null };

let data: Data = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function now() {
  return new Date().toISOString();
}

let lastStorageWarningAt = 0;

function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  // Different browsers report the same "storage full" condition differently.
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    // Data was NOT saved — surface this instead of silently dropping the user's changes.
    // Throttled so a burst of edits (e.g. typing) doesn't spam toasts.
    const nowMs = Date.now();
    if (nowMs - lastStorageWarningAt > 15000) {
      lastStorageWarningAt = nowMs;
      toast.error(
        isQuotaExceeded(err)
          ? "Penyimpanan lokal penuh — perubahan terakhir (kemungkinan termasuk gambar) belum tersimpan. Hapus beberapa gambar/catatan lama, lalu coba lagi."
          : "Gagal menyimpan perubahan ke penyimpanan lokal perangkat ini.",
      );
    }
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function loadLocal() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Data;
      data = {
        subjects: parsed.subjects ?? [],
        pages: parsed.pages ?? [],
        images: parsed.images ?? [],
        lastPull: parsed.lastPull ?? null,
      };
    }
  } catch {
    data = EMPTY;
  }
  emit();
}

export function setData(next: Data) {
  data = next;
  persist();
  emit();
}

export function getData() {
  return data;
}

/**
 * Satu-satunya cara "resmi" buat domain store lain (subjectStore, pageStore, dst)
 * mengubah data. Dipakai supaya persist+emit selalu konsisten di semua tempat.
 */
export function updateData(fn: (d: Data) => Data) {
  setData(fn(data));
}

/* ---------------- selectors ---------------- */

export function useData(): Data {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => EMPTY,
  );
}

export function activeSubjects(d: Data) {
  return d.subjects
    .filter((s) => !s.deleted)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position);
}

export function subjectPages(d: Data, subjectId: string) {
  return d.pages
    .filter((p) => p.subject_id === subjectId && !p.deleted)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position);
}

export function trashItems(d: Data) {
  return {
    subjects: d.subjects.filter((s) => s.deleted),
    pages: d.pages.filter((p) => p.deleted && !isSubjectDeleted(d, p.subject_id)),
  };
}

export function isSubjectDeleted(d: Data, subjectId: string) {
  return d.subjects.find((s) => s.id === subjectId)?.deleted ?? false;
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export type SearchHit = {
  page: Page;
  subject: Subject | undefined;
  snippet: string;
};

export function search(d: Data, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const page of d.pages) {
    if (page.deleted || isSubjectDeleted(d, page.subject_id)) continue;
    const text = stripHtml(page.content);
    const inTitle = page.title.toLowerCase().includes(q);
    const idx = text.toLowerCase().indexOf(q);
    if (!inTitle && idx < 0) continue;
    const start = Math.max(0, idx - 40);
    const snippet =
      idx < 0 ? text.slice(0, 90) : (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 60);
    hits.push({
      page,
      subject: d.subjects.find((s) => s.id === page.subject_id),
      snippet,
    });
  }
  return hits.slice(0, 40);
}

export function extractImages(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1] ?? "");
  return out;
}

const IDB_SRC_PREFIX = "idb:";

/** Ambil cuma id gambar lokal (skema `idb:<id>`) dari sebuah `content` HTML. */
export function extractLocalImageIds(html: string): string[] {
  return extractImages(html)
    .filter((src) => src.startsWith(IDB_SRC_PREFIX))
    .map((src) => src.slice(IDB_SRC_PREFIX.length));
}

export function dirtyCount() {
  return (
    data.subjects.filter((s) => s.dirty).length +
    data.pages.filter((p) => p.dirty).length +
    data.images.filter((i) => i.dirty).length
  );
}

export function clearLocal() {
  setData({ subjects: [], pages: [], images: [], lastPull: null });
}
