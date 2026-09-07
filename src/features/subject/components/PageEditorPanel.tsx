import { useRef } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Editor } from "@/components/noteme/editor/Editor";
import type { Page } from "@/storage/local/dataCore";
import { patchPage } from "@/storage/local/pageStore";
import { useExportMenu } from "../hooks/useExportMenu";
import { ExportMenu } from "./ExportMenu";

export function PageEditorPanel({
  active,
  renaming,
  draftTitle,
  onStartRename,
  onDraftTitleChange,
  onFinishRename,
  onDelete,
  onSwipe,
}: {
  active: Page;
  renaming: string | null;
  draftTitle: string;
  onStartRename: () => void;
  onDraftTitleChange: (v: string) => void;
  onFinishRename: () => void;
  onDelete: () => void;
  onSwipe: (dir: -1 | 1) => void;
}) {
  const exportMenu = useExportMenu();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <section
      className="glass-card spring-in mt-2 flex min-h-0 flex-1 flex-col rounded-3xl px-4 py-3 md:px-7 md:py-5"
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 50) onSwipe(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-start gap-2 pb-2 md:pb-4">
        {renaming === active.id ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => onDraftTitleChange(e.target.value)}
            onBlur={onFinishRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="flex-1 rounded-xl bg-input px-3 py-1.5 text-xl font-bold outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <h2 className="flex-1 text-xl font-bold tracking-tight">{active.title}</h2>
        )}
        <div className="flex flex-none items-center gap-2.5">
          <button
            aria-label="Ganti nama"
            onClick={onStartRename}
            className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            aria-label={active.pinned ? "Lepas sematan" : "Sematkan"}
            onClick={() => patchPage(active.id, { pinned: !active.pinned })}
            className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
          >
            {active.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
          <ExportMenu pageId={active.id} menu={exportMenu} />
          <span className="mx-0.5 h-5 w-px flex-none bg-border" aria-hidden="true" />
          <button
            aria-label="Pindahkan ke trash"
            onClick={onDelete}
            className="press-sm flex size-9 items-center justify-center rounded-full bg-input text-destructive active:scale-90"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <Editor
        pageId={active.id}
        initialContent={active.content}
        onChange={(html) => patchPage(active.id, { content: html })}
      />
    </section>
  );
}
