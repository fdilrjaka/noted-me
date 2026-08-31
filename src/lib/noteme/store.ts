import { useSyncExternalStore } from "react";

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
};

export type Data = {
  subjects: Subject[];
  pages: Page[];
  lastPull: string | null;
};

const KEY = "noteme.data.v1";

export const SUBJECT_COLORS = ["blue", "purple", "pink", "teal", "amber"] as const;

const EMPTY: Data = { subjects: [], pages: [], lastPull: null };

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

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked — keep in-memory state */
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
      idx < 0
        ? text.slice(0, 90)
        : (start > 0 ? "…" : "") + text.slice(start, idx + q.length + 60);
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
  };
  update((d) => ({ ...d, pages: [...d.pages, page] }));
  return id;
}

export function patchPage(id: string, patch: Partial<Page>) {
  update((d) => ({
    ...d,
    pages: d.pages.map((p) => (p.id === id ? { ...p, ...patch, updated_at: now(), dirty: true } : p)),
  }));
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

export function purgeSubject(id: string) {
  update((d) => ({
    ...d,
    subjects: d.subjects.filter((s) => s.id !== id),
    pages: d.pages.filter((p) => p.subject_id !== id),
  }));
}

export function purgePage(id: string) {
  update((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));
}

export function emptyTrash() {
  update((d) => {
    const goneSubjects = d.subjects.filter((s) => s.deleted).map((s) => s.id);
    return {
      ...d,
      subjects: d.subjects.filter((s) => !s.deleted),
      pages: d.pages.filter((p) => !p.deleted && !goneSubjects.includes(p.subject_id)),
    };
  });
}

export function dirtyCount() {
  return (
    data.subjects.filter((s) => s.dirty).length + data.pages.filter((p) => p.dirty).length
  );
}

export function clearLocal() {
  setData({ subjects: [], pages: [], lastPull: null });
}
