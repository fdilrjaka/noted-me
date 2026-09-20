import { useState } from "react";
import { toast } from "sonner";
import { deletePage } from "@/storage/local/pageStore";

/**
 * Mode "pilih banyak" untuk hapus beberapa pertemuan sekaligus. Dipisah dari
 * SubjectView karena ini satu unit interaksi sendiri (toggle mode, toggle
 * item, hapus terpilih) yang dipakai baik di tab desktop maupun sidebar sheet.
 */
export function usePageSelection() {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  /** Hapus semua pertemuan terpilih. Kalau salah satu yang dihapus lagi aktif,
   * `onActiveDeleted` dipanggil dengan sisa halaman biar caller bisa pindah tab. */
  const deleteSelectedPages = (
    activeId: string | undefined,
    pages: { id: string }[],
    onActiveDeleted: (nextId: string) => void,
  ) => {
    const count = selected.size;
    const deletedIds = new Set(selected);
    selected.forEach((id) => deletePage(id));
    toast.success(
      count > 1 ? `${count} pertemuan dipindahkan ke trash` : "Pertemuan dipindahkan ke trash",
    );
    exitSelectMode();
    if (activeId && deletedIds.has(activeId)) {
      const rest = pages.filter((p) => !deletedIds.has(p.id));
      if (rest[0]) onActiveDeleted(rest[0].id);
    }
  };

  return {
    selectMode,
    setSelectMode,
    selected,
    toggleSelected,
    exitSelectMode,
    deleteSelectedPages,
  };
}
