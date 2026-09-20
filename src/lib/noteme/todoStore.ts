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
        tasks: parsed.tasks ?? [],
        lastPull: parsed.lastPull ?? null,
      };
    }
  } catch {
    preserveCorrupt(KEY, raw);
    data = EMPTY;
  }
  emit();
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
  patchTask(id, { completed: !task.completed });
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
