import { useEffect, useRef } from "react";
import { ArrowUp, FileText, Loader2, NotebookText, Paperclip, Square, X } from "lucide-react";
import { ACCEPT_ATTR } from "../lib/attachments";
import { LIMITS } from "../lib/wire";
import type { AiAttachment } from "../types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  attachments: AiAttachment[];
  pending: string[];
  sending: boolean;
  onFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onOpenNotes: () => void;
  onSend: () => void;
  onCancel: () => void;
};

function Chip({ a, onRemove }: { a: AiAttachment; onRemove: () => void }) {
  return (
    <li className="glass-soft flex max-w-[16rem] items-center gap-2 rounded-xl py-1 pl-1.5 pr-1 text-xs">
      {a.kind === "image" && a.dataUrl ? (
        <img src={a.dataUrl} alt="" className="size-8 flex-none rounded-lg object-cover" />
      ) : a.kind === "note" ? (
        <NotebookText className="size-4 flex-none text-primary" aria-hidden="true" />
      ) : (
        <FileText className="size-4 flex-none text-primary" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate" title={a.name}>
        {a.name}
      </span>
      {a.truncated && (
        <span
          className="flex-none rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
          title={`Hanya ${LIMITS.maxAttachmentChars.toLocaleString("id-ID")} karakter pertama yang dikirim`}
        >
          dipotong
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Hapus lampiran ${a.name}`}
        className="press-sm flex size-6 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

export function Composer({
  value,
  onChange,
  attachments,
  pending,
  sending,
  onFiles,
  onRemoveAttachment,
  onOpenNotes,
  onSend,
  onCancel,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Tinggi textarea mengikuti isi (maks 200px).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const busyReading = pending.length > 0;
  const canSend = !sending && !busyReading && (value.trim().length > 0 || attachments.length > 0);

  return (
    <form
      className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      {(attachments.length > 0 || busyReading) && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Lampiran">
          {attachments.map((a) => (
            <Chip key={a.id} a={a} onRemove={() => onRemoveAttachment(a.id)} />
          ))}
          {pending.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="glass-soft flex max-w-[16rem] items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-muted-foreground"
            >
              <Loader2 className="size-3.5 flex-none animate-spin" aria-hidden="true" />
              <span className="truncate">Membaca {name}…</span>
            </li>
          ))}
        </ul>
      )}

      <div className="glass-soft flex items-end gap-1 rounded-3xl p-1.5">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) onFiles(files);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Lampirkan file atau gambar"
          title="Lampirkan file atau gambar"
          className="press-sm flex size-10 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <Paperclip className="size-5" />
        </button>
        <button
          type="button"
          onClick={onOpenNotes}
          aria-label="Lampirkan halaman catatan"
          title="Lampirkan halaman catatan"
          className="press-sm flex size-10 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <NotebookText className="size-5" />
        </button>

        <textarea
          ref={areaRef}
          value={value}
          rows={1}
          maxLength={LIMITS.maxInputChars}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              onFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            // Di layar sentuh, Enter = baris baru (kirim lewat tombol).
            if (window.matchMedia("(pointer: coarse)").matches) return;
            e.preventDefault();
            if (canSend) onSend();
          }}
          placeholder="Tulis pertanyaan, atau lampirkan file dan catatan"
          aria-label="Pesan untuk AI"
          className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {sending ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Batalkan permintaan"
            title="Batalkan"
            className="press-sm flex size-10 flex-none items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Kirim"
            title="Kirim"
            className="press-sm flex size-10 flex-none items-center justify-center rounded-full bg-slate-900 text-white transition-opacity disabled:opacity-30 dark:bg-white dark:text-slate-900"
          >
            <ArrowUp className="size-5" />
          </button>
        )}
      </div>
    </form>
  );
}
