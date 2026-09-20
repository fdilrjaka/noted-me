import { supabase } from "@/integrations/supabase/client";
import { decodeCursor, nextCursor, pullChanges } from "@/storage/remote/pull";
import {
  getTodoData,
  setTodoData,
  type TodoData,
  type TodoSection,
  type TodoTask,
} from "./todoStore";

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */

function sectionRow(s: TodoSection, userId: string): Row {
  return {
    id: s.id,
    user_id: userId,
    category_id: s.category_id,
    name: s.name,
    position: s.position,
    deleted: s.deleted,
    updated_at: s.updated_at,
  };
}

function taskRow(t: TodoTask, userId: string): Row {
  return {
    id: t.id,
    user_id: userId,
    section_id: t.section_id,
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    completed: t.completed,
    progress: t.progress,
    position: t.position,
    deleted: t.deleted,
    updated_at: t.updated_at,
  };
}

function buildSection(row: Row): TodoSection {
  return {
    id: String(row["id"]),
    category_id: String(row["category_id"]),
    name: String(row["name"] ?? ""),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

function buildTask(row: Row): TodoTask {
  const completed = Boolean(row["completed"]);
  const rawProgress = row["progress"] == null ? null : Number(row["progress"]);
  const progress = completed ? 100 : Math.max(0, Math.min(100, rawProgress ?? 0));
  return {
    id: String(row["id"]),
    section_id: String(row["section_id"]),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    deadline: row["deadline"] == null ? null : String(row["deadline"]),
    completed: completed || progress >= 100,
    progress: completed ? 100 : progress,
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

// Last-write-wins per baris berdasarkan `updated_at`: versi yang lebih baru menang, di sisi
// lokal maupun remote. Ini cukup buat task/section (field pendek & terstruktur) — beda dari isi
// catatan (Page.content) yang butuh dialog konflik di sync.ts karena bisa kehilangan banyak tulisan.
//
// Dua aturan yang dulu terlewat:
//  1. Remote yang LEBIH BARU dari baris lokal yang dirty harus menang SEBELUM push, bukan
//     sesudahnya. Dulu push selalu jalan duluan sehingga edit di perangkat lain tertimpa diam-diam
//     (lihat `isRemoteNewer` dipakai untuk menyaring baris yang akan di-push).
//  2. Salinan remote yang lebih LAMA tidak boleh menimpa baris lokal (mis. baris yang baru saja
//     di-push, sudah bersih, tetapi salinan server lama sempat ditarik sebelum push).
const ts = (value: string) => Date.parse(value);

function isRemoteNewer(remoteUpdatedAt: string | undefined, localUpdatedAt: string): boolean {
  return remoteUpdatedAt !== undefined && ts(remoteUpdatedAt) > ts(localUpdatedAt);
}

// Versi + isi baris. `updated_at` saja tidak cukup untuk memastikan "yang terkirim = yang ada
// sekarang": dua edit dalam milidetik yang sama menghasilkan stempel yang sama.
function rowSig(item: object): string {
  return JSON.stringify(
    Object.entries(item)
      .filter(([key]) => key !== "dirty")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function remoteVersions(rows: Array<Record<string, unknown>>): Map<string, string> {
  return new Map(
    rows.map((r) => [String(r["id"]), new Date(String(r["updated_at"])).toISOString()]),
  );
}

function mergeRemote<T extends { id: string; updated_at: string; dirty: boolean }>(
  local: T[],
  remote: Array<Record<string, unknown>>,
  build: (row: Record<string, unknown>) => T,
): T[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const row of remote) {
    const incoming = build(row);
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }
    if (isRemoteNewer(incoming.updated_at, existing.updated_at)) {
      byId.set(incoming.id, incoming); // remote lebih baru: menang, walau lokal dirty
    }
    // selain itu lokal sama/lebih baru: pertahankan (yang dirty akan ter-push)
  }
  return [...byId.values()];
}

let running: Promise<void> | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Data lama menyimpan id numerik (Date.now) yang ditolak kolom uuid di server.
// Beri id UUID baru (task ikut dipetakan ke section_id baru) lalu simpan lokal
// supaya upsert berikutnya valid.
function migrateLegacyIds(data: TodoData): TodoData {
  const needs =
    data.sections.some((s) => !UUID_RE.test(s.id)) ||
    data.tasks.some((t) => !UUID_RE.test(t.id) || !UUID_RE.test(t.section_id));
  if (!needs) return data;
  const idMap = new Map<string, string>();
  const sections = data.sections.map((s) => {
    if (UUID_RE.test(s.id)) return s;
    const id = crypto.randomUUID();
    idMap.set(s.id, id);
    return { ...s, id, dirty: true as const };
  });
  const tasks = data.tasks.map((t) => {
    const id = UUID_RE.test(t.id) ? t.id : crypto.randomUUID();
    const section_id = idMap.get(t.section_id) ?? t.section_id;
    if (id === t.id && section_id === t.section_id) return t;
    return { ...t, id, section_id, dirty: true as const };
  });
  const next = { ...data, sections, tasks };
  setTodoData(next);
  return next;
}

export function syncTodoNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = doSync(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(userId: string, full: boolean) {
  const before = migrateLegacyIds(getTodoData());
  const since = full ? "1970-01-01T00:00:00.000Z" : decodeCursor(before.lastPull);

  const [sectionsRes, tasksRes] = await Promise.all([
    pullChanges("todo_sections", since),
    pullChanges("todo_tasks", since),
  ]);

  // Baris dirty yang ternyata sudah diubah LEBIH BARU di perangkat lain tidak di-push: remote
  // menang dan akan menimpa versi lokal di mergeRemote di bawah.
  const remoteSectionVersions = remoteVersions(sectionsRes.rows);
  const remoteTaskVersions = remoteVersions(tasksRes.rows);
  const dirtySections = before.sections.filter(
    (s) =>
      s.dirty &&
      UUID_RE.test(s.id) &&
      !isRemoteNewer(remoteSectionVersions.get(s.id), s.updated_at),
  );
  const dirtyTasks = before.tasks.filter(
    (t) =>
      t.dirty &&
      UUID_RE.test(t.id) &&
      UUID_RE.test(t.section_id) &&
      !isRemoteNewer(remoteTaskVersions.get(t.id), t.updated_at),
  );

  if (dirtySections.length) {
    const { error } = await supabase
      .from("todo_sections")
      .upsert(dirtySections.map((s) => sectionRow(s, userId)) as any);
    if (error) throw error;
  }
  if (dirtyTasks.length) {
    const { error } = await supabase
      .from("todo_tasks")
      .upsert(dirtyTasks.map((t) => taskRow(t, userId)) as any);
    if (error) throw error;
  }

  const pushedSections = new Map(dirtySections.map((s) => [s.id, rowSig(s)]));
  const pushedTasks = new Map(dirtyTasks.map((t) => [t.id, rowSig(t)]));

  // State TERBARU (bukan `before`): user bisa mengedit selagi request di atas berjalan.
  const current = getTodoData();
  const sections = current.sections.map((s) =>
    pushedSections.get(s.id) === rowSig(s) ? { ...s, dirty: false } : s,
  );
  const tasks = current.tasks.map((t) =>
    pushedTasks.get(t.id) === rowSig(t) ? { ...t, dirty: false } : t,
  );

  const next: TodoData = {
    sections: mergeRemote(sections, sectionsRes.rows, buildSection),
    tasks: mergeRemote(tasks, tasksRes.rows, buildTask),
    lastPull: nextCursor(before.lastPull, [sectionsRes, tasksRes]),
  };

  setTodoData(next);
}
