import { getData, now, uid, updateData, type Page } from "./dataCore";
import { purgeImagesForPages } from "./imagePurge";

export function createPage(subjectId: string, title?: string) {
  const data = getData();
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
  updateData((d) => ({ ...d, pages: [...d.pages, page] }));
  return id;
}

export function patchPage(id: string, patch: Partial<Page>) {
  const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
  updateData((d) => ({
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

export function reorderPages(subjectId: string, orderedIds: string[]) {
  const positionOf = new Map(orderedIds.map((id, i) => [id, i]));
  updateData((d) => ({
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

export function purgePage(id: string) {
  const data = getData();
  const removedPage = data.pages.find((p) => p.id === id);
  updateData((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));
  if (removedPage) purgeImagesForPages([removedPage]);
}

export function emptyTrash() {
  const data = getData();
  const goneSubjects = data.subjects.filter((s) => s.deleted).map((s) => s.id);
  const removedPages = data.pages.filter((p) => p.deleted || goneSubjects.includes(p.subject_id));
  updateData((d) => {
    const goneSubjectIds = d.subjects.filter((s) => s.deleted).map((s) => s.id);
    return {
      ...d,
      subjects: d.subjects.filter((s) => !s.deleted),
      pages: d.pages.filter((p) => !p.deleted && !goneSubjectIds.includes(p.subject_id)),
    };
  });
  purgeImagesForPages(removedPages);
}
