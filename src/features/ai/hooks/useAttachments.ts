import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { checkAddable, readAttachment } from "../lib/attachments";
import type { AiAttachment } from "../types";

/** Lampiran yang sedang disiapkan di composer: baca file, validasi batas, tampilkan galat. */
export function useAttachments() {
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const ref = useRef<AiAttachment[]>([]);

  const set = useCallback((next: AiAttachment[]) => {
    ref.current = next;
    setAttachments(next);
  }, []);

  const push = useCallback(
    (att: AiAttachment) => {
      const problem = checkAddable(ref.current, att);
      if (problem) {
        toast.error(problem);
        return;
      }
      set([...ref.current, att]);
    },
    [set],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        setPending((p) => [...p, file.name]);
        try {
          push(await readAttachment(file));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Gagal membaca "${file.name}".`);
        } finally {
          setPending((p) => {
            const i = p.indexOf(file.name);
            return i < 0 ? p : [...p.slice(0, i), ...p.slice(i + 1)];
          });
        }
      }
    },
    [push],
  );

  const remove = useCallback((id: string) => set(ref.current.filter((a) => a.id !== id)), [set]);
  const clear = useCallback(() => set([]), [set]);

  return { attachments, pending, addFiles, addAttachment: push, remove, clear };
}
