import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, FileUp, History, SquarePen } from "lucide-react";
import { Sidebar } from "@/components/noteme/Sidebar";
import { useSession } from "@/hooks/useSession";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { Composer } from "./components/Composer";
import { HistorySheet } from "./components/HistorySheet";
import { MessageBubble, WaitingRow } from "./components/MessageBubble";
import { NotePicker } from "./components/NotePicker";
import { useAiChat } from "./hooks/useAiChat";
import { useAttachments } from "./hooks/useAttachments";
import { collectArtifacts, firstArtifactKeyOf } from "./lib/artifacts";
import type { FileSpec } from "./lib/fileSpec";

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Panel kanan (artifact): file yang terbuka + hasil edit pengguna (disimpan di memori sesi ini).
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, FileSpec>>({});

  const { active, sending } = chat;
  const messages = active.messages;
  const artifacts = useMemo(() => collectArtifacts(messages), [messages]);
  const openArtifact = openKey ? artifacts.find((a) => a.key === openKey) : undefined;

  // Pindah percakapan: tutup panel. Jawaban baru yang memuat file: buka otomatis.
  const prevRef = useRef({ id: active.id, count: messages.length });
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { id: active.id, count: messages.length };
    if (prev.id !== active.id) {
      setOpenKey(null);
      setEdits({});
      return;
    }
    if (messages.length <= prev.count) return;
    const key = firstArtifactKeyOf(messages[messages.length - 1]);
    if (key) setOpenKey(key);
  }, [active.id, messages]);

  const closePanel = useCallback(() => setOpenKey(null), []);
  const editFile = useCallback(
    (key: string, spec: FileSpec) => setEdits((e) => ({ ...e, [key]: spec })),
    [],
  );
  const resetFile = useCallback(
    (key: string) =>
      setEdits((e) => {
        const { [key]: _drop, ...rest } = e;
        return rest;
      }),
    [],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = scrollerRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (typeof el.scrollTo === "function")
      el.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    else el.scrollTop = top;
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
      className="relative flex h-dvh w-full text-foreground md:pl-[5.5rem]"
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

      <div ref={scrollerRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col">
          <header className="sticky top-0 z-20 bg-background/70 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
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
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-2">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center pb-6">
                <h2 className="text-2xl font-bold tracking-tight">Tanya apa saja soal catatanmu</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Lampirkan PDF, DOCX, teks, gambar, atau halaman catatan, lalu minta ringkasan,
                  soal latihan, atau penjelasan.
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
                    openKey={openKey}
                    onOpenFile={setOpenKey}
                  />
                ))}
                {sending && <WaitingRow />}
              </div>
            )}
          </div>
          <div className="sticky bottom-0 z-20 bg-background/70 backdrop-blur-md">
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
          </div>
        </div>
      </div>

      {openArtifact && (
        <ArtifactPanel
          artifact={openArtifact}
          artifacts={artifacts}
          edited={edits[openArtifact.key]}
          chatTitle={active.title}
          onSelect={setOpenKey}
          onEdit={editFile}
          onReset={resetFile}
          onClose={closePanel}
        />
      )}

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
