import { supabase } from "@/integrations/supabase/client";
import { getTodoData, setTodoData, type TodoData, type TodoSection, type TodoTask } from "./todoStore";

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
  return {
    id: String(row["id"]),
    section_id: String(row["section_id"]),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    deadline: row["deadline"] == null ? null : String(row["deadline"]),
    completed: Boolean(row["completed"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

// Last-write-wins per baris: kalau baris lokal masih dirty (belum ke-push) dan
// versi remote-nya lebih baru, remote yang menang begitu online. Ini cukup buat
// task/section (field pendek & terstruktur) — beda dari isi catatan (Page.content)
// yang butuh dialog konflik di sync.ts karena bisa kehilangan banyak tulisan.
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
    if (existing.dirty && existing.updated_at >= incoming.updated_at) continue;
    byId.set(incoming.id, incoming);
  }
  return [...byId.values()];
}

let running: Promise<void> | null = null;

export function syncTodoNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = doSync(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(userId: string, full: boolean) {
  const before = getTodoData();
  const since = full ? "1970-01-01T00:00:00.000Z" : (before.lastPull ?? "1970-01-01T00:00:00.000Z");

  const [sectionsRes, tasksRes] = await Promise.all([
    supabase.from("todo_sections").select("*").gt("updated_at", since),
    supabase.from("todo_tasks").select("*").gt("updated_at", since),
  ]);
  if (sectionsRes.error) throw sectionsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const dirtySections = before.sections.filter((s) => s.dirty);
  const dirtyTasks = before.tasks.filter((t) => t.dirty);

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

  const pushedSections = new Map(dirtySections.map((s) => [s.id, s.updated_at]));
  const pushedTasks = new Map(dirtyTasks.map((t) => [t.id, t.updated_at]));

  const current = getTodoData();
  const sections = current.sections.map((s) =>
    pushedSections.get(s.id) === s.updated_at ? { ...s, dirty: false } : s,
  );
  const tasks = current.tasks.map((t) =>
    pushedTasks.get(t.id) === t.updated_at ? { ...t, dirty: false } : t,
  );

  const next: TodoData = {
    sections: mergeRemote(sections, sectionsRes.data ?? [], buildSection),
    tasks: mergeRemote(tasks, tasksRes.data ?? [], buildTask),
    lastPull: new Date(Date.now() - 5000).toISOString(),
  };

  setTodoData(next);
}
