import { getData, now, uid, updateData, SUBJECT_COLORS, type Subject } from "./dataCore";
import { purgeImagesForPages } from "./imagePurge";
import { createPage } from "./pageStore";

export function createSubject(name: string) {
  const data = getData();
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
  updateData((d) => ({ ...d, subjects: [...d.subjects, subject] }));
  createPage(id, "Pertemuan 1");
  return id;
}

export function patchSubject(id: string, patch: Partial<Subject>) {
  updateData((d) => ({
    ...d,
    subjects: d.subjects.map((s) =>
      s.id === id ? { ...s, ...patch, updated_at: now(), dirty: true } : s,
    ),
  }));
}

export function deleteSubject(id: string) {
  patchSubject(id, { deleted: true });
}

export function restoreSubject(id: string) {
  patchSubject(id, { deleted: false });
}

export function purgeSubject(id: string) {
  const data = getData();
  const removedPages = data.pages.filter((p) => p.subject_id === id);
  updateData((d) => ({
    ...d,
    subjects: d.subjects.filter((s) => s.id !== id),
    pages: d.pages.filter((p) => p.subject_id !== id),
  }));
  purgeImagesForPages(removedPages);
}
