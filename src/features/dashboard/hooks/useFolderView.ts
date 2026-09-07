import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteFolder,
  removeSubjectFromFolder,
  useFolders,
  type Folder,
} from "@/lib/noteme/folderStore";

/**
 * State untuk daftar folder + sheet detail folder yang lagi dibuka (isi, hapus,
 * keluarkan mata kuliah dari folder). Dipisah dari Dashboard karena ini satu unit
 * fitur sendiri (folder), terpisah dari grid mata kuliah & drag/drop.
 */
export function useFolderView() {
  const folders = useFolders();
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const openFolder = useMemo(
    () => folders.find((f) => f.id === openFolderId) ?? null,
    [folders, openFolderId],
  );

  const closeFolder = () => setOpenFolderId(null);

  const handleDeleteFolder = (folder: Folder) => {
    const count = folder.subjectIds.length;
    deleteFolder(folder.id);
    closeFolder();
    toast.success(
      count > 0 ? `Folder dihapus, ${count} catatan kembali ke dashboard utama` : "Folder dihapus",
    );
  };

  const handleRemoveFromFolder = (subjectId: string) => {
    removeSubjectFromFolder(subjectId);
    toast.success("Catatan dikeluarkan dari folder");
  };

  return {
    folders,
    openFolderId,
    setOpenFolderId,
    openFolder,
    closeFolder,
    handleDeleteFolder,
    handleRemoveFromFolder,
  };
}
