import { activeSubjects, stripHtml, subjectPages, useData } from "@/storage/local/dataCore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { AiAttachment } from "../types";
import { noteAttachment } from "../lib/attachments";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (attachment: AiAttachment) => void;
};

export function NotePicker({ open, onOpenChange, onPick }: Props) {
  const data = useData();
  const subjects = activeSubjects(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lampirkan halaman catatan</DialogTitle>
          <DialogDescription>
            Teks halaman dikirim ke AI sebagai konteks. Gambar di dalam catatan tidak ikut.
          </DialogDescription>
        </DialogHeader>

        {subjects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada catatan. Buat mata kuliah dan halaman dulu di Notes.
          </p>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject) => {
              const pages = subjectPages(data, subject.id);
              if (pages.length === 0) return null;
              return (
                <section key={subject.id}>
                  <h3 className="mb-1 px-1 text-sm font-semibold">{subject.name}</h3>
                  <ul className="space-y-1">
                    {pages.map((page) => {
                      const text = stripHtml(page.content);
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            disabled={!text}
                            onClick={() => {
                              try {
                                onPick(noteAttachment(`${subject.name} / ${page.title}`, text));
                                onOpenChange(false);
                              } catch (err) {
                                toast.error(
                                  err instanceof Error ? err.message : "Gagal melampirkan.",
                                );
                              }
                            }}
                            className="press-sm flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <span className="truncate">{page.title}</span>
                            <span className="flex-none text-xs text-muted-foreground">
                              {text ? `${text.length.toLocaleString("id-ID")} karakter` : "kosong"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
