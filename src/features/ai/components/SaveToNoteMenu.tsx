import { NotebookPen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { activeSubjects, useData } from "@/storage/local/dataCore";
import { createPage, patchPage } from "@/storage/local/pageStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { renderMarkdown, titleFromMarkdown } from "../lib/markdown";

export function SaveToNoteMenu({
  markdown,
  fallbackTitle,
}: {
  markdown: string;
  fallbackTitle: string;
}) {
  const data = useData();
  const navigate = useNavigate();
  const subjects = activeSubjects(data);

  const save = (subjectId: string, subjectName: string) => {
    const pageId = createPage(subjectId, titleFromMarkdown(markdown, fallbackTitle));
    patchPage(pageId, { content: renderMarkdown(markdown) });
    toast.success(`Disimpan ke ${subjectName}`, {
      action: {
        label: "Buka",
        onClick: () =>
          void navigate({
            to: "/subject/$subjectId",
            params: { subjectId },
            search: { page: pageId },
          }),
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="press-sm flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <NotebookPen className="size-3.5" aria-hidden="true" />
          Simpan ke catatan
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto">
        <DropdownMenuLabel>Simpan sebagai halaman baru di</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {subjects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Belum ada mata kuliah. Buat dulu di halaman Notes.
          </div>
        ) : (
          subjects.map((s) => (
            <DropdownMenuItem key={s.id} onSelect={() => save(s.id, s.name)}>
              <span className="truncate">{s.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
