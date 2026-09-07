import type { NoteImage, Page, Subject } from "@/storage/local/dataCore";

export type Row = Record<string, unknown>;

export function buildPage(row: Row): Page {
  return {
    id: String(row["id"]),
    subject_id: String(row["subject_id"]),
    title: String(row["title"] ?? ""),
    content: String(row["content"] ?? ""),
    pinned: Boolean(row["pinned"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
    editedOffline: false,
  };
}

export function buildSubject(row: Row): Subject {
  return {
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    color: String(row["color"] ?? "blue"),
    pinned: Boolean(row["pinned"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

export function buildNoteImage(row: Row): NoteImage {
  return {
    id: String(row["id"]),
    page_id: String(row["page_id"]),
    storage_path: row["storage_path"] == null ? null : String(row["storage_path"]),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

export function noteImageRow(i: NoteImage, userId: string): Row {
  return {
    id: i.id,
    user_id: userId,
    page_id: i.page_id,
    storage_path: i.storage_path,
    deleted: i.deleted,
    updated_at: i.updated_at,
  };
}

export function subjectRow(s: Subject, userId: string): Row {
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

export function pageRow(p: Page, userId: string): Row {
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
