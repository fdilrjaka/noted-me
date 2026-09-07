import { useState } from "react";
import { toast } from "sonner";
import { deleteSubject } from "@/storage/local/subjectStore";

/**
 * Mode pilih-banyak di dashboard: pilih beberapa mata kuliah lalu hapus sekaligus
 * (pindah ke trash). Dipisah dari Dashboard supaya state select-mode gak nyampur
 * sama state drag & drop / composer.
 */
export function useSelection() {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelected(new Set());
    } else {
      setSelectMode(true);
    }
  };

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

  const deleteSelected = () => {
    const count = selected.size;
    selected.forEach((id) => deleteSubject(id));
    toast.success(
      count > 1 ? `${count} mata kuliah dipindahkan ke trash` : "Mata kuliah dipindahkan ke trash",
    );
    exitSelectMode();
  };

  return {
    selectMode,
    selected,
    toggleSelectMode,
    toggleSelected,
    exitSelectMode,
    deleteSelected,
  };
}
