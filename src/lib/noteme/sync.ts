import { supabase } from "@/integrations/supabase/client";
import { getData, setData, type Data, type Page, type Subject } from "./store";

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */

function subjectRow(s: Subject, userId: string): Row {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    color: s.color,
    pinned: s.pinned,
    position: s.position,
    deleted: s.deleted,
    updated_at: s.updated_at,
  };
}

function pageRow(p: Page, userId: string): Row {
  return {
    id: p.id,
    user_id: userId,
    subject_id: p.subject_id,
    title: p.title,
    content: p.content,
    pinned: p.pinned,
    position: p.position,
    deleted: p.deleted,
    updated_at: p.updated_at,
  };
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
    // Never overwrite un-synced local edits that are newer than the server copy.
    if (existing.dirty && existing.updated_at >= incoming.updated_at) continue;
    byId.set(incoming.id, incoming);
  }
  return [...byId.values()];
}

let running: Promise<void> | null = null;

export function syncNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = doSync(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(userId: string, full: boolean) {
  const before = getData();
  const dirtySubjects = before.subjects.filter((s) => s.dirty);
  const dirtyPages = before.pages.filter((p) => p.dirty);

  if (dirtySubjects.length) {
    const { error } = await supabase
      .from("subjects")
      .upsert(dirtySubjects.map((s) => subjectRow(s, userId)) as any);
    if (error) throw error;
  }
  if (dirtyPages.length) {
    const { error } = await supabase
      .from("pages")
      .upsert(dirtyPages.map((p) => pageRow(p, userId)) as any);
    if (error) throw error;
  }

  const pushedSubjects = new Map(dirtySubjects.map((s) => [s.id, s.updated_at]));
  const pushedPages = new Map(dirtyPages.map((p) => [p.id, p.updated_at]));

  const since = full ? "1970-01-01T00:00:00.000Z" : (before.lastPull ?? "1970-01-01T00:00:00.000Z");

  const [subjectsRes, pagesRes] = await Promise.all([
    supabase.from("subjects").select("*").gt("updated_at", since),
    supabase.from("pages").select("*").gt("updated_at", since),
  ]);
  if (subjectsRes.error) throw subjectsRes.error;
  if (pagesRes.error) throw pagesRes.error;

  const current = getData();
  // Clear dirty flags only for rows unchanged since we pushed them.
  const subjects = current.subjects.map((s) =>
    pushedSubjects.get(s.id) === s.updated_at ? { ...s, dirty: false } : s,
  );
  const pages = current.pages.map((p) =>
    pushedPages.get(p.id) === p.updated_at ? { ...p, dirty: false } : p,
  );

  const next: Data = {
    subjects: mergeRemote(subjects, subjectsRes.data ?? [], (row) => ({
      id: String(row['id']),
      name: String(row['name'] ?? ""),
      color: String(row['color'] ?? "blue"),
      pinned: Boolean(row['pinned']),
      position: Number(row['position'] ?? 0),
      deleted: Boolean(row['deleted']),
      updated_at: new Date(String(row['updated_at'])).toISOString(),
      dirty: false,
    })),
    pages: mergeRemote(pages, pagesRes.data ?? [], (row) => ({
      id: String(row['id']),
      subject_id: String(row['subject_id']),
      title: String(row['title'] ?? ""),
      content: String(row['content'] ?? ""),
      pinned: Boolean(row['pinned']),
      position: Number(row['position'] ?? 0),
      deleted: Boolean(row['deleted']),
      updated_at: new Date(String(row['updated_at'])).toISOString(),
      dirty: false,
    })),
    lastPull: new Date(Date.now() - 5000).toISOString(),
  };

  setData(next);
}
