import { memo, useEffect, useMemo, useState } from "react";
import { AlertCircle, Copy, FileText, NotebookText, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sanitizeStoredHtml } from "@/lib/noteme/sanitizeHtml";
import { renderMarkdown } from "../lib/markdown";
import type { AiAttachment, AiMessage } from "../types";
import { SaveToNoteMenu } from "./SaveToNoteMenu";

const actionBtn =
  "press-sm flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-foreground/10 hover:text-foreground";

function AttachmentTag({ a }: { a: AiAttachment }) {
  if (a.kind === "image" && a.dataUrl) {
    return (
      <img
        src={a.dataUrl}
        alt={a.name}
        className="max-h-40 max-w-[12rem] rounded-xl object-cover"
      />
    );
  }
  const Icon = a.kind === "note" ? NotebookText : FileText;
  return (
    <span className="flex max-w-[14rem] items-center gap-1.5 rounded-lg bg-foreground/5 px-2 py-1 text-xs">
      <Icon className="size-3.5 flex-none text-primary" aria-hidden="true" />
      <span className="truncate" title={a.name}>
        {a.kind === "image" ? `${a.name} (gambar tidak disimpan)` : a.name}
      </span>
    </span>
  );
}

type Props = {
  message: AiMessage;
  isLast: boolean;
  chatTitle: string;
  onRetry: () => void;
};

export const MessageBubble = memo(function MessageBubble({
  message,
  isLast,
  chatTitle,
  onRetry,
}: Props) {
  const html = useMemo(
    () =>
      message.role === "assistant" && !message.error
        ? sanitizeStoredHtml(renderMarkdown(message.text))
        : "",
    [message],
  );

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] space-y-2 rounded-3xl rounded-br-lg bg-primary/15 px-4 py-2.5 md:max-w-[75%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((a) => (
                <AttachmentTag key={a.id} a={a} />
              ))}
            </div>
          )}
          {message.text && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">
              {message.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex items-start gap-2.5" role="alert">
        <AlertCircle className="mt-0.5 size-5 flex-none text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm text-foreground">{message.text}</p>
          {isLast && (
            <button type="button" onClick={onRetry} className={`${actionBtn} -ml-2 mt-1`}>
              <RotateCw className="size-3.5" aria-hidden="true" />
              Kirim ulang
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="ai-prose" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="-ml-2 mt-1 flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            className={actionBtn}
            onClick={() => {
              navigator.clipboard
                .writeText(message.text)
                .then(() => toast.success("Jawaban disalin"))
                .catch(() => toast.error("Tidak bisa menyalin. Izinkan akses clipboard."));
            }}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Salin
          </button>
          <SaveToNoteMenu markdown={message.text} fallbackTitle={chatTitle} />
          {isLast && (
            <button type="button" onClick={onRetry} className={actionBtn}>
              <RotateCw className="size-3.5" aria-hidden="true" />
              Ulangi
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/** Indikator menunggu (gateway tidak streaming): setelah 10 detik muncul petunjuk. */
export function WaitingRow() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex items-start gap-2.5" role="status" aria-live="polite">
      <span className="mt-0.5 flex size-7 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="pt-1.5">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full bg-muted-foreground/70 motion-safe:animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="sr-only">AI sedang menyiapkan jawaban</span>
        {slow && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Masih menunggu gateway. Jawaban panjang atau lampiran besar bisa butuh setengah menit
            lebih.
          </p>
        )}
      </div>
    </div>
  );
}
