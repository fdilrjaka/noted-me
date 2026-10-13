import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, FileUp, History, SquarePen } from "lucide-react";
import { Sidebar } from "@/components/noteme/Sidebar";
import { useSession } from "@/hooks/useSession";
import { Composer } from "./components/Composer";
import { HistorySheet } from "./components/HistorySheet";
import { MessageBubble, WaitingRow } from "./components/MessageBubble";
import { NotePicker } from "./components/NotePicker";
import { useAiChat } from "./hooks/useAiChat";
import { useAttachments } from "./hooks/useAttachments";

const SUGGESTIONS = [
  "Rangkum catatan yang kulampirkan jadi poin-poin utama",
  "Buat 5 soal latihan dari materi ini beserta kunci jawabannya",
  "Jelaskan isi gambar ini langkah demi langkah",
];

const iconBtn =
  "press-sm flex size-10 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground";

export function AiPage() {
  const { user, loading } = useSession();
  if (loading) return <main className="min-h-dvh" />;
  if (!user) return <SignedOut />;
  return <Workspace userId={user.id} />;
}

function SignedOut() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center md:pl-[5.5rem]">
      <Sidebar />
      <h1 className="text-2xl font-bold tracking-tight">AI Chat butuh akun</h1>
      <p className="text-sm text-muted-foreground">
        Supaya kuota AI tidak disalahgunakan, fitur ini hanya untuk akun yang sudah masuk. Catatanmu
        di mode tanpa akun tetap aman.
      </p>
      <Link
        to="/auth"
        className="press-sm flex h-11 items-center rounded-xl bg-slate-900 px-5 text-[15px] font-semibold text-white dark:bg-white dark:text-slate-900"
      >
        Masuk
      </Link>
    </main>
  );
}

function Workspace({ userId }: { userId: string }) {
  const chat = useAiChat(userId);
  const files = useAttachments();
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { active, sending } = chat;
  const messages = active.messages;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages.length, sending, active.id]);

  const submit = () => {
    const text = draft;
    const attachments = files.attachments;
    setDraft("");
    files.clear();
    void chat.send(text, attachments);
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <main
      className="relative flex h-dvh w-full flex-col text-foreground md:pl-[5.5rem]"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        void files.addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <Sidebar />

      <header className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <Link to="/explore" aria-label="Kembali" className={`${iconBtn} -ml-2 md:hidden`}>
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">
          {messages.length > 0 ? active.title : "ai chat"}
        </h1>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Riwayat chat"
          title="Riwayat chat"
          className={iconBtn}
        >
          <History className="size-5" />
        </button>
        <button
          type="button"
          onClick={chat.newChat}
          aria-label="Percakapan baru"
          title="Percakapan baru"
          className={iconBtn}
        >
          <SquarePen className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
        <div className="mx-auto h-full w-full max-w-3xl px-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center pb-6">
              <h2 className="text-2xl font-bold tracking-tight">Tanya apa saja soal catatanmu</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Lampirkan PDF, DOCX, teks, gambar, atau halaman catatan, lalu minta ringkasan, soal
                latihan, atau penjelasan.
              </p>
              <ul className="mt-5 flex flex-col items-start gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setDraft(s)}
                      className="press-sm glass-soft rounded-2xl px-4 py-2.5 text-left text-sm"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-6 pb-2">
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1 && !sending}
                  chatTitle={active.title}
                  onRetry={() => void chat.retry()}
                />
              ))}
              {sending && <WaitingRow />}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4">
        <Composer
          value={draft}
          onChange={setDraft}
          attachments={files.attachments}
          pending={files.pending}
          sending={sending}
          onFiles={(list) => void files.addFiles(list)}
          onRemoveAttachment={files.remove}
          onOpenNotes={() => setNotesOpen(true)}
          onSend={submit}
          onCancel={chat.cancel}
        />
      </div>

      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary bg-background/80 backdrop-blur-sm"
        >
          <FileUp className="size-8 text-primary" />
          <p className="text-sm font-semibold">Lepas file di sini</p>
        </div>
      )}

      <NotePicker open={notesOpen} onOpenChange={setNotesOpen} onPick={files.addAttachment} />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        chats={chat.chats}
        activeId={active.id}
        onSelect={chat.selectChat}
        onDelete={chat.removeChat}
      />
    </main>
  );
}