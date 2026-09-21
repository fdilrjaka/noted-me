import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { preserveCorrupt } from "@/storage/local/corruptBackup";

/** 5 kategori tetap — ditentukan di klien, bukan tabel terpisah, biar sederhana. */
export const TODO_CATEGORIES = [
  { id: "project", label: "Project" },
  { id: "tugas-kuliah", label: "Tugas Kuliah" },
  { id: "organisasi", label: "Organisasi" },
  { id: "pribadi", label: "Pribadi" },
  { id: "lainnya", label: "Lainnya" },
] as const;

export type TodoCategoryId = (typeof TODO_CATEGORIES)[number]["id"];

export type TodoSection = {
  id: string;
  category_id: string;
  name: string;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
};

export type TodoTask = {
  id: string;
  section_id: string;
  title: string;
  description: string;
  // ISO date (YYYY-MM-DD) atau datetime lokal (YYYY-MM-DDTHH:mm) kalau ada jam,
  // atau null kalau belum ada deadline.
  deadline: string | null;
  completed: boolean;
  // Progres 0–100. Invarian: completed <=> progress === 100.
  progress: number;
  // Label bebas per task (mis. "uas", "kelompok"); dipakai untuk filter & urutan.
  tags: string[];
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
};

export type TodoData = {
  sections: TodoSection[];
  tasks: TodoTask[];
  lastPull: string | null;
};

const KEY = "noteme.todo.v1";
const EMPTY: TodoData = { sections: [], tasks: [], lastPull: null };

let data: TodoData = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    toast.error("Gagal menyimpan perubahan To Do List ke penyimpanan lokal perangkat ini.");
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function loadTodoLocal() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TodoData;
      data = {
        sections: parsed.sections ?? [],
        // Data lama belum punya `progress`: turunkan dari status selesai.
        tasks: (parsed.tasks ?? []).map((t) => ({
          ...t,
          progress: taskProgress(t),
          tags: Array.isArray(t.tags) ? t.tags : [],
        })),
        lastPull: parsed.lastPull ?? null,
      };
    }
  } catch {
    preserveCorrupt(KEY, raw);
    data = EMPTY;
  }
  emit();
}

/** Progres task (0–100); aman untuk data lama yang belum punya field `progress`. */
export function taskProgress(t: Pick<TodoTask, "completed"> & { progress?: number | null }) {
  if (t.completed) return 100;
  const p = typeof t.progress === "number" ? t.progress : 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

export function setTodoData(next: TodoData) {
  data = next;
  persist();
  emit();
}

export function getTodoData() {
  return data;
}

function update(fn: (d: TodoData) => TodoData) {
  setTodoData(fn(data));
}

export function useTodoData(): TodoData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => EMPTY,
  );
}

/* ---------------- selectors ---------------- */

export function categorySections(d: TodoData, categoryId: string) {
  return d.sections
    .filter((s) => s.category_id === categoryId && !s.deleted)
    .sort((a, b) => a.position - b.position);
}

export function sectionTasks(d: TodoData, sectionId: string) {
  return d.tasks
    .filter((t) => t.section_id === sectionId && !t.deleted)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.position - b.position);
}

export function dirtyTodoCount() {
  return data.sections.filter((s) => s.dirty).length + data.tasks.filter((t) => t.dirty).length;
}

/* ---------------- mutations ---------------- */

export function createSection(categoryId: string, name: string) {
  const id = uid();
  const siblings = data.sections.filter((s) => s.category_id === categoryId && !s.deleted);
  const section: TodoSection = {
    id,
    category_id: categoryId,
    name: name.trim() || "Section baru",
    position: siblings.reduce((max, s) => Math.max(max, s.position), 0) + 1,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  update((d) => ({ ...d, sections: [...d.sections, section] }));
  return id;
}

export function patchSection(id: string, patch: Partial<TodoSection>) {
  update((d) => ({
    ...d,
    sections: d.sections.map((s) =>
      s.id === id ? { ...s, ...patch, updated_at: now(), dirty: true } : s,
    ),
  }));
}

export function deleteSection(id: string) {
  patchSection(id, { deleted: true });
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      t.section_id === id ? { ...t, deleted: true, updated_at: now(), dirty: true } : t,
    ),
  }));
}

export function createTask(sectionId: string, title: string, deadline: string | null = null) {
  const id = uid();
  const siblings = data.tasks.filter((t) => t.section_id === sectionId && !t.deleted);
  const task: TodoTask = {
    id,
    section_id: sectionId,
    title: title.trim() || "Task baru",
    description: "",
    deadline,
    completed: false,
    progress: 0,
    tags: [],
    position: siblings.reduce((max, t) => Math.max(max, t.position), 0) + 1,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  update((d) => ({ ...d, tasks: [...d.tasks, task] }));
  return id;
}

export function patchTask(id: string, patch: Partial<TodoTask>) {
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      t.id === id ? { ...t, ...patch, updated_at: now(), dirty: true } : t,
    ),
  }));
}

export function toggleTaskCompleted(id: string) {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;
  const done = !taskProgress(task) || taskProgress(task) < 100;
  patchTask(id, { completed: done, progress: done ? 100 : 0 });
}

export function setTaskProgress(id: string, progress: number) {
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  patchTask(id, { progress: p, completed: p >= 100 });
}

/** Rapikan input tag: buang '#', spasi berlebih, duplikat (tanpa peduli huruf besar), maks 6. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/^#+/, "").trim().replace(/\s+/g, " ").slice(0, 20);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 6) break;
  }
  return out;
}

/** Ganti nama tag di semua task (kalau namanya sudah ada, otomatis digabung). */
export function renameTag(from: string, to: string) {
  const key = from.toLowerCase();
  const [next] = normalizeTags([to]);
  if (!next) return;
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      t.deleted || !t.tags.some((g) => g.toLowerCase() === key)
        ? t
        : {
            ...t,
            tags: normalizeTags(t.tags.map((g) => (g.toLowerCase() === key ? next : g))),
            updated_at: now(),
            dirty: true,
          },
    ),
  }));
}

/** Lepas satu tag dari semua task. */
export function deleteTag(tag: string) {
  const key = tag.toLowerCase();
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      t.deleted || !t.tags.some((g) => g.toLowerCase() === key)
        ? t
        : {
            ...t,
            tags: t.tags.filter((g) => g.toLowerCase() !== key),
            updated_at: now(),
            dirty: true,
          },
    ),
  }));
}

/** Hapus (soft-delete) semua task yang sudah selesai di section-section tertentu. */
export function deleteCompletedTasks(sectionIds: string[]) {
  const ids = new Set(sectionIds);
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      ids.has(t.section_id) && !t.deleted && taskProgress(t) >= 100
        ? { ...t, deleted: true, updated_at: now(), dirty: true }
        : t,
    ),
  }));
}

export function deleteTask(id: string) {
  patchTask(id, { deleted: true });
}

export function reorderTasks(sectionId: string, orderedIds: string[]) {
  const positionOf = new Map(orderedIds.map((id, i) => [id, i]));
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      t.section_id === sectionId && positionOf.has(t.id)
        ? { ...t, position: positionOf.get(t.id)!, updated_at: now(), dirty: true }
        : t,
    ),
  }));
}

export function clearTodoLocal() {
  setTodoData({ sections: [], tasks: [], lastPull: null });
}
