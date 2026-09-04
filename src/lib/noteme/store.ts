import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { deleteImage as deleteLocalImage } from "./imageStore";

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

function now() {
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
    const now = Date.now();
    if (now - lastStorageWarningAt > 15000) {
      lastStorageWarningAt = now;
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

function update(fn: (d: Data) => Data) {
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

function isSubjectDeleted(d: Data, subjectId: string) {
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

/* ---------------- mutations ---------------- */

export function createSubject(name: string) {
  const id = uid();
  const position = (data.subjects.reduce((max, s) => Math.max(max, s.position), 0) || 0) + 1;
  const color = SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length] ?? "blue";
  const subject: Subject = {
    id,
    name: name.trim() || "Mata Kuliah",
    color,
    pinned: false,
    position,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  update((d) => ({ ...d, subjects: [...d.subjects, subject] }));
  createPage(id, "Pertemuan 1");
  return id;
}

export function patchSubject(id: string, patch: Partial<Subject>) {
  update((d) => ({
    ...d,
    subjects: d.subjects.map((s) =>
      s.id === id ? { ...s, ...patch, updated_at: now(), dirty: true } : s,
    ),
  }));
}

export function createPage(subjectId: string, title?: string) {
  const siblings = data.pages.filter((p) => p.subject_id === subjectId && !p.deleted);
  const id = uid();
  const page: Page = {
    id,
    subject_id: subjectId,
    title: title?.trim() || `Pertemuan ${siblings.length + 1}`,
    content: "",
    pinned: false,
    position: siblings.reduce((max, p) => Math.max(max, p.position), 0) + 1,
    deleted: false,
    updated_at: now(),
    dirty: true,
    editedOffline: typeof navigator !== "undefined" && !navigator.onLine,
  };
  update((d) => ({ ...d, pages: [...d.pages, page] }));
  return id;
}

export function patchPage(id: string, patch: Partial<Page>) {
  const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
  update((d) => ({
    ...d,
    pages: d.pages.map((p) =>
      p.id === id
        ? {
            ...p,
            ...patch,
            updated_at: now(),
            dirty: true,
            // Sticky sampai berhasil sync: sekali edit ini kesentuh offline, tetap dianggap
            // "edit offline" walau sisa ketikan berikutnya terjadi pas udah online lagi.
            editedOffline: p.editedOffline || offlineNow,
          }
        : p,
    ),
  }));
}

/**
 * Dipanggil setelah `imageStore.putImage` berhasil nyimpen blob baru secara lokal —
 * bikin row metadata `NoteImage` yang dirty, biar `sync.ts` tahu ada gambar baru yang
 * perlu diupload ke Supabase Storage begitu online.
 */
export function registerLocalImage(id: string, pageId: string) {
  const image: NoteImage = {
    id,
    page_id: pageId,
    storage_path: null,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  update((d) => ({ ...d, images: [...d.images, image] }));
}

/** Dipanggil sync.ts setelah blob sukses keupload ke Storage. */
export function markImageUploaded(id: string, storagePath: string) {
  update((d) => ({
    ...d,
    images: d.images.map((img) =>
      img.id === id ? { ...img, storage_path: storagePath, updated_at: now(), dirty: true } : img,
    ),
  }));
}

/** Catat row metadata gambar yang datang dari sync (device lain) tapi belum pernah tercatat lokal — dipakai imageResolver saat lazy-download. */
export function upsertImageMeta(image: NoteImage) {
  update((d) => {
    const exists = d.images.some((img) => img.id === image.id);
    return {
      ...d,
      images: exists
        ? d.images.map((img) => (img.id === image.id ? image : img))
        : [...d.images, image],
    };
  });
}

export function deleteSubject(id: string) {
  patchSubject(id, { deleted: true });
}

export function restoreSubject(id: string) {
  patchSubject(id, { deleted: false });
}

export function reorderPages(subjectId: string, orderedIds: string[]) {
  const positionOf = new Map(orderedIds.map((id, i) => [id, i]));
  update((d) => ({
    ...d,
    pages: d.pages.map((p) =>
      p.subject_id === subjectId && positionOf.has(p.id)
        ? { ...p, position: positionOf.get(p.id)!, updated_at: now(), dirty: true }
        : p,
    ),
  }));
}

export function deletePage(id: string) {
  patchPage(id, { deleted: true });
}

export function restorePage(id: string) {
  patchPage(id, { deleted: false });
}

// Hapus blob lokal (IndexedDB) buat tiap gambar `idb:` di halaman-halaman yang beneran
// dihapus permanen, dan tandai row NoteImage terkait `deleted: true, dirty: true` biar
// object-nya ikut kehapus dari Supabase Storage lewat sync.ts. Best-effort & async —
// tidak memblokir/menunggu penghapusan lokal selesai (purge/emptyTrash tetap sinkron
// dari sudut pandang caller).
function purgeImagesForPages(pages: Page[]) {
  const imageIds = new Set<string>();
  for (const page of pages) {
    for (const id of extractLocalImageIds(page.content)) imageIds.add(id);
  }
  if (imageIds.size === 0) return;
  for (const id of imageIds) void deleteLocalImage(id);
  update((d) => ({
    ...d,
    images: d.images.map((img) =>
      imageIds.has(img.id) ? { ...img, deleted: true, updated_at: now(), dirty: true } : img,
    ),
  }));
}

export function purgeSubject(id: string) {
  const removedPages = data.pages.filter((p) => p.subject_id === id);
  update((d) => ({
    ...d,
    subjects: d.subjects.filter((s) => s.id !== id),
    pages: d.pages.filter((p) => p.subject_id !== id),
  }));
  purgeImagesForPages(removedPages);
}

export function purgePage(id: string) {
  const removedPage = data.pages.find((p) => p.id === id);
  update((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));
  if (removedPage) purgeImagesForPages([removedPage]);
}

export function emptyTrash() {
  const goneSubjects = data.subjects.filter((s) => s.deleted).map((s) => s.id);
  const removedPages = data.pages.filter((p) => p.deleted || goneSubjects.includes(p.subject_id));
  update((d) => {
    const goneSubjectIds = d.subjects.filter((s) => s.deleted).map((s) => s.id);
    return {
      ...d,
      subjects: d.subjects.filter((s) => !s.deleted),
      pages: d.pages.filter((p) => !p.deleted && !goneSubjectIds.includes(p.subject_id)),
    };
  });
  purgeImagesForPages(removedPages);
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
