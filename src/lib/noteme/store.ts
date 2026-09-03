import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* =============================================================================
 * LEGACY DATA LAYER — subjects / pages / note_images
 * =============================================================================
 * Ini lapisan data yang dipakai untuk sinkronisasi ke Supabase (lihat
 * src/lib/noteme/sync.ts), backup JSON/Markdown/PDF (backup.ts), resolusi
 * gambar (imageResolver.ts), editor (Editor.tsx), status sync & dialog
 * konflik (SyncEngine.tsx), serta halaman akun & trash (routes/auth.tsx,
 * routes/trash.tsx). Bentuknya HARUS persis sama dengan skema tabel di
 * supabase/migrations/*.sql — jangan diubah tanpa mengubah migration-nya juga.
 * ============================================================================= */

export interface Subject {
  id: string;
  name: string;
  color: string;
  pinned: boolean;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
}

export interface Page {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
}

export interface NoteImage {
  id: string;
  page_id: string;
  storage_path: string | null;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
}

export interface Data {
  subjects: Subject[];
  pages: Page[];
  images: NoteImage[];
  lastPull: string | null;
}

const LOCAL_KEY = "noteme.data.v1";

function emptyData(): Data {
  return { subjects: [], pages: [], images: [], lastPull: null };
}

let data: Data = emptyData();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Snapshot sinkron dari data lokal saat ini. */
export function getData(): Data {
  return data;
}

function persistData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    // best-effort — kalau localStorage penuh/diblokir, data tetap ada di memori
  }
}

/** Ganti seluruh data lokal, simpan ke localStorage, dan beri tahu semua listener. */
export function setData(next: Data) {
  data = next;
  persistData();
  emit();
}

/**
 * Muat data dari localStorage ke memori. Dipanggil sekali saat SyncEngine mount
 * (lihat komponen SyncStatus di SyncEngine.tsx) supaya catatan offline langsung
 * kebaca begitu app dibuka.
 */
export function loadLocal() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Data>;
    data = {
      subjects: parsed.subjects ?? [],
      pages: parsed.pages ?? [],
      images: parsed.images ?? [],
      lastPull: parsed.lastPull ?? null,
    };
    emit();
  } catch {
    // data lokal corrupt — mulai dari kosong daripada bikin app crash
  }
}

/** Hook React ke data lokal (subjects/pages/images), re-render tiap kali setData dipanggil. */
export function useData(): Data {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => emptyData(),
  );
}

/** Buang semua tag HTML dari konten editor, dipakai untuk backup teks/PDF & pencarian. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Subject yang belum dibuang ke trash, urut pinned dulu lalu posisi. */
export function activeSubjects(state: Data): Subject[] {
  return state.subjects
    .filter((s) => !s.deleted)
    .sort((a, b) => (a.pinned === b.pinned ? a.position - b.position : a.pinned ? -1 : 1));
}

/** Halaman/pertemuan aktif milik satu subject, urut pinned dulu lalu posisi. */
export function subjectPages(state: Data, subjectId: string): Page[] {
  return state.pages
    .filter((p) => p.subject_id === subjectId && !p.deleted)
    .sort((a, b) => (a.pinned === b.pinned ? a.position - b.position : a.pinned ? -1 : 1));
}

/** Subject & page yang sedang ada di trash (deleted: true). */
export function trashItems(state: Data): { subjects: Subject[]; pages: Page[] } {
  return {
    subjects: state.subjects.filter((s) => s.deleted),
    pages: state.pages.filter((p) => p.deleted),
  };
}

const IMAGE_REF_RE = /idb:([a-zA-Z0-9-]+)/g;

/** Ambil semua id gambar lokal (`idb:<id>`) yang direferensikan di dalam konten HTML. */
export function extractLocalImageIds(content: string): string[] {
  if (!content) return [];
  const ids = new Set<string>();
  IMAGE_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMAGE_REF_RE.exec(content))) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

function touch(): string {
  return new Date().toISOString();
}

/**
 * Daftarkan gambar `idb:<id>` yang baru saja disisipkan Editor ke satu page,
 * supaya sync tahu ada gambar baru yang perlu diupload (storage_path masih null).
 */
export function registerLocalImage(id: string, pageId: string) {
  const current = getData();
  const now = touch();
  const exists = current.images.some((img) => img.id === id);
  const images = exists
    ? current.images.map((img) =>
        img.id === id
          ? { ...img, page_id: pageId, deleted: false, updated_at: now, dirty: true }
          : img,
      )
    : [
        ...current.images,
        { id, page_id: pageId, storage_path: null, deleted: false, updated_at: now, dirty: true },
      ];
  setData({ ...current, images });
}

export function restoreSubject(id: string) {
  const current = getData();
  setData({
    ...current,
    subjects: current.subjects.map((s) =>
      s.id === id ? { ...s, deleted: false, updated_at: touch(), dirty: true } : s,
    ),
  });
}

export function purgeSubject(id: string) {
  const current = getData();
  setData({
    ...current,
    subjects: current.subjects.filter((s) => s.id !== id),
    pages: current.pages.filter((p) => p.subject_id !== id),
  });
}

export function restorePage(id: string) {
  const current = getData();
  setData({
    ...current,
    pages: current.pages.map((p) =>
      p.id === id ? { ...p, deleted: false, updated_at: touch(), dirty: true } : p,
    ),
  });
}

export function purgePage(id: string) {
  const current = getData();
  setData({ ...current, pages: current.pages.filter((p) => p.id !== id) });
}

/** Kosongkan trash permanen: buang semua subject & page yang sudah ditandai deleted. */
export function emptyTrash() {
  const current = getData();
  const purgedSubjectIds = new Set(current.subjects.filter((s) => s.deleted).map((s) => s.id));
  setData({
    ...current,
    subjects: current.subjects.filter((s) => !s.deleted),
    pages: current.pages.filter((p) => !p.deleted && !purgedSubjectIds.has(p.subject_id)),
  });
}

/** Jumlah baris (subject/page/image) yang belum ke-push ke server. */
export function dirtyCount(state?: Data): number {
  const d = state ?? getData();
  return (
    d.subjects.filter((s) => s.dirty).length +
    d.pages.filter((p) => p.dirty).length +
    d.images.filter((i) => i.dirty).length
  );
}

/* =============================================================================
 * MATA KULIAH SCHEDULE STORE (dashboard baru)
 * =============================================================================
 * State lokal-saja (tidak ikut sync ke Supabase) untuk kartu jadwal mata
 * kuliah di routes/index.tsx & routes/subject.$subjectId.tsx. Sengaja pakai
 * nama tipe yang berbeda dari layer legacy di atas (CourseSubject, bukan
 * Subject) supaya dua model data ini tidak saling tabrak.
 * ============================================================================= */

export interface SubjectSection {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface CourseSubject {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  sections: SubjectSection[];
  createdAt: string;
}

export interface SectionItem {
  id: string;
  subjectId: string;
  sectionId: string;
  title: string;
  content?: string;
  completed?: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  isDirty?: boolean;
}

export interface NoteMeState {
  subjects: CourseSubject[];
  items: SectionItem[];

  // Subject Actions
  addSubject: (data: { name: string; day: string; startTime: string; endTime: string; room?: string }) => void;
  updateSubject: (id: string, data: Partial<Omit<CourseSubject, "id" | "createdAt">>) => void;
  deleteSubject: (id: string) => void;

  // Section Actions
  addSection: (subjectId: string, sectionName: string) => void;
  deleteSection: (subjectId: string, sectionId: string) => void;

  // Item Actions
  addItem: (data: { subjectId: string; sectionId: string; title: string; content?: string; dueDate?: string }) => void;
  updateItem: (id: string, data: Partial<Omit<SectionItem, "id" | "subjectId" | "sectionId" | "createdAt">>) => void;
  deleteItem: (id: string) => void;
  toggleItemComplete: (id: string) => void;
}

const DEFAULT_SECTIONS: SubjectSection[] = [
  { id: "catatan", name: "Catatan", isDefault: true },
  { id: "tugas", name: "Tugas", isDefault: true },
  { id: "project", name: "Project", isDefault: true },
];

const INITIAL_SUBJECTS: CourseSubject[] = [
  {
    id: "sbj-1",
    name: "Inovasi Teknologi Finansial",
    day: "Senin",
    startTime: "10:30",
    endTime: "13:00",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-2",
    name: "Kapita Selekta Analitik Data",
    day: "Selasa",
    startTime: "13:30",
    endTime: "16:00",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-3",
    name: "Metode Ketangkasan",
    day: "Kamis",
    startTime: "07:30",
    endTime: "10:00",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-4",
    name: "Arsitektur Perusahaan untuk Transformasi Digital",
    day: "Kamis",
    startTime: "10:30",
    endTime: "13:00",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-5",
    name: "Pengembangan Produk",
    day: "Jumat",
    startTime: "07:00",
    endTime: "09:30",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-6",
    name: "Metodologi Penelitian Bisnis",
    day: "Jumat",
    startTime: "09:40",
    endTime: "11:40",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sbj-7",
    name: "Manajemen Strategis",
    day: "Jumat",
    startTime: "13:30",
    endTime: "16:00",
    room: "",
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
];

export const useNoteMeStore = create<NoteMeState>()(
  persist(
    (set, get) => ({
      subjects: INITIAL_SUBJECTS,
      items: [],

      addSubject: (payload) => {
        const newSubject: CourseSubject = {
          id: `sbj-${Date.now()}`,
          name: payload.name,
          day: payload.day,
          startTime: payload.startTime,
          endTime: payload.endTime,
          room: payload.room || "",
          sections: [...DEFAULT_SECTIONS],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ subjects: [newSubject, ...state.subjects] }));
      },

      updateSubject: (id, payload) => {
        set((state) => ({
          subjects: state.subjects.map((sbj) => (sbj.id === id ? { ...sbj, ...payload } : sbj)),
        }));
      },

      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((sbj) => sbj.id !== id),
          items: state.items.filter((item) => item.subjectId !== id),
        }));
      },

      addSection: (subjectId, sectionName) => {
        const sectionId = `sec-${Date.now()}`;
        set((state) => ({
          subjects: state.subjects.map((sbj) =>
            sbj.id === subjectId
              ? { ...sbj, sections: [...sbj.sections, { id: sectionId, name: sectionName }] }
              : sbj,
          ),
        }));
      },

      deleteSection: (subjectId, sectionId) => {
        set((state) => ({
          subjects: state.subjects.map((sbj) =>
            sbj.id === subjectId
              ? { ...sbj, sections: sbj.sections.filter((sec) => sec.id !== sectionId) }
              : sbj,
          ),
          items: state.items.filter(
            (item) => !(item.subjectId === subjectId && item.sectionId === sectionId),
          ),
        }));
      },

      addItem: (payload) => {
        const newItem: SectionItem = {
          id: `item-${Date.now()}`,
          subjectId: payload.subjectId,
          sectionId: payload.sectionId,
          title: payload.title,
          content: payload.content || "",
          completed: false,
          dueDate: payload.dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDirty: true,
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      updateItem: (id, payload) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...payload, isDirty: true, updatedAt: new Date().toISOString() }
              : item,
          ),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },

      toggleItemComplete: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, completed: !item.completed, isDirty: true } : item,
          ),
        }));
      },
    }),
    {
      name: "noteme-subjects-storage",
    },
  ),
);
