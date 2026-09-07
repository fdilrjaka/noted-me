import { useState } from "react";
import { createFolder } from "@/lib/noteme/folderStore";
import { createSubject } from "@/storage/local/subjectStore";

export type ComposerMode = "note" | "folder" | null;

/**
 * Dialog "buat baru" di dashboard — dipakai buat bikin folder atau mata kuliah
 * baru. Dipisah dari Dashboard biar state input & submit-nya gak nyampur ke
 * logika drag/select.
 */
export function useComposer() {
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [name, setName] = useState("");

  const open = (mode: Exclude<ComposerMode, null>) => setComposerMode(mode);

  const close = () => {
    setName("");
    setComposerMode(null);
  };

  const submit = () => {
    if (name.trim()) {
      if (composerMode === "folder") createFolder(name);
      else createSubject(name);
    }
    close();
  };

  return { composerMode, name, setName, open, close, submit };
}
