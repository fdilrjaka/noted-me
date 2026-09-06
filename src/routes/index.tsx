import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Check,
  Download,
  FileText,
  Folder as FolderIcon,
  NotebookPen,
  Palette,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { BrandMark } from "@/components/noteme/BrandMark";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { HueSlider } from "@/components/HueSlider";
import { useBackgroundHue } from "@/hooks/use-background-hue";
import { useSession } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import {
  assignSubjectToFolder,
  createFolder,
  deleteFolder,
  removeSubjectFromFolder,
  useFolders,
} from "@/lib/noteme/folderStore";
import { exportBackupJson, exportBackupMarkdown, importBackupJson } from "@/lib/noteme/backup";
import {
  activeSubjects,
  createSubject,
  deleteSubject,
  search,
  subjectPages,
  useData,
} from "@/lib/noteme/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoteMe — Catatan Mata Kuliah" },
      {
        name: "description",
        content:
          "Dashboard NoteMe: semua mata kuliah dan catatan per pertemuan, bisa dipakai offline dan tersinkron otomatis.",
      },
    ],
  }),
  component: Dashboard,
});

const lastModifiedFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatLastModified(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return lastModifiedFormatter.format(d);
}

export function Dashboard() {
  const data = useData();
  const navigate = useNavigate();
  const { user } = useSession();
  const { hue, setHue } = useBackgroundHue();
  const profileMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const profileAvatarUrl =
    typeof profileMeta["avatar_url"] === "string" ? (profileMeta["avatar_url"] as string) : null;
  const profileAvatarColor =
    typeof profileMeta["avatar_color"] === "string"
      ? (profileMeta["avatar_color"] as string)
      : "#7c3aed";
  const profileNickname =
    typeof profileMeta["nickname"] === "string" ? (profileMeta["nickname"] as string) : "";
  const profileUsername = user?.email?.replace("@noteme.app", "") ?? "";
  const profileInitial =
    (profileNickname.trim() || profileUsername.trim())[0]?.toUpperCase() ?? "?";
  const [query, setQuery] = useState("");
  const [actionHubOpen, setActionHubOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"note" | "folder" | null>(null);
  const [name, setName] = useState("");
  const folders = useFolders();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverFolderId, setHoverFolderId] = useState<string | null>(null);
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    timer: number | null;
    longPressed: boolean;
    hoverFolderId: string | null;
  } | null>(null);

  const LONG_PRESS_MS = 380;
  const MOVE_CANCEL_PX = 10;

  const subjects = useMemo(() => activeSubjects(data), [data]);
  const folderedIds = useMemo(() => new Set(folders.flatMap((f) => f.subjectIds)), [folders]);
  const mainSubjects = useMemo(
    () => subjects.filter((s) => !folderedIds.has(s.id)),
    [subjects, folderedIds],
  );
  const openFolder = useMemo(
    () => folders.find((f) => f.id === openFolderId) ?? null,
    [folders, openFolderId],
  );

  const clearDragTimer = () => {
    if (dragStateRef.current?.timer) window.clearTimeout(dragStateRef.current.timer);
  };

  const handleCardPointerDown = (e: ReactPointerEvent, subjectId: string) => {
    if (e.button === 2) return;
    // Pointer capture memastikan pointermove/pointerup TETAP terkirim ke card
    // ini walau jari/kursor sudah bergerak ke atas elemen lain (mis. folder).
    // Tanpa ini, event lepas jari bisa "nyasar" ke elemen di bawahnya dan
    // drag jadi tidak pernah selesai (ghost mengambang terus).
    e.currentTarget.setPointerCapture(e.pointerId);
    // Saat selectMode aktif, tap hanya untuk toggle pilihan — tidak perlu
    // drag/long-press ke folder, jadi timer-nya dilewati saja (timer: null).
    // Sebelumnya fungsi ini return lebih awal saat selectMode, sehingga
    // dragStateRef.current tidak pernah terisi dan pointerUp (yang butuh
    // state ini) tidak pernah men-toggle seleksi — itu sebabnya card tidak
    // bisa dipencet saat mode pilih aktif.
    dragStateRef.current = {
      id: subjectId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      timer: selectMode
        ? null
        : window.setTimeout(() => {
            if (!dragStateRef.current || dragStateRef.current.id !== subjectId) return;
            dragStateRef.current.longPressed = true;
            setDraggingId(subjectId);
            setDragPos({ x: dragStateRef.current.startX, y: dragStateRef.current.startY });
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
          }, LONG_PRESS_MS),
      longPressed: false,
      hoverFolderId: null,
    };
  };

  const handleCardPointerMove = (e: ReactPointerEvent) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (!state.longPressed) {
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearDragTimer();
        dragStateRef.current = null;
      }
      return;
    }
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const folderEl = el?.closest("[data-folder-drop]") as HTMLElement | null;
    const nextHover = folderEl?.dataset["folderDrop"] ?? null;
    state.hoverFolderId = nextHover;
    setHoverFolderId(nextHover);
  };

  const finishDrag = (e?: ReactPointerEvent) => {
    const state = dragStateRef.current;
    clearDragTimer();
    if (e && state && e.currentTarget.hasPointerCapture(state.pointerId)) {
      e.currentTarget.releasePointerCapture(state.pointerId);
    }
    dragStateRef.current = null;
    setDraggingId(null);
    setHoverFolderId(null);
  };

  const handleCardPointerUp = (
    e: ReactPointerEvent,
    subjectId: string,
    firstPageId: string | undefined,
  ) => {
    const state = dragStateRef.current;
    if (!state) return;
    if (state.longPressed) {
      if (state.hoverFolderId) {
        assignSubjectToFolder(subjectId, state.hoverFolderId);
        toast.success("Catatan dipindahkan ke folder");
      }
      finishDrag(e);
    } else {
      clearDragTimer();
      if (e.currentTarget.hasPointerCapture(state.pointerId)) {
        e.currentTarget.releasePointerCapture(state.pointerId);
      }
      dragStateRef.current = null;
      if (selectMode) toggleSelected(subjectId);
      else openSubject(subjectId, firstPageId);
    }
  };

  const draggingSubject = draggingId ? subjects.find((s) => s.id === draggingId) : null;

  const openSubject = (subjectId: string, pageId: string | undefined) => {
    void navigate({
      to: "/subject/$subjectId",
      params: { subjectId },
      search: { page: pageId },
    });
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    const count = selected.size;
    selected.forEach((id) => deleteSubject(id));
    toast.success(
      count > 1 ? `${count} mata kuliah dipindahkan ke trash` : "Mata kuliah dipindahkan ke trash",
    );
    exitSelectMode();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const result = await importBackupJson(file);
      toast.success(
        `Dipulihkan: ${result.subjects} mata kuliah, ${result.pages} catatan${
          result.images ? `, ${result.images} gambar` : ""
        }`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan cadangan");
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <main
      ref={(el) => {
        mainRef.current = el;
        registerNavDragTarget(el);
      }}
      className="min-h-dvh w-full safe-top safe-bottom-lg"
    >
      <Sidebar />
      <div className="md:ml-[16.5rem]">
        <div className="mx-auto w-full max-w-5xl px-4">
          <header className="flex items-center justify-between gap-3 py-4">
            <div>
              <BrandMark className="text-2xl" />
              <div className="mt-0.5">
                <SyncStatus />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setColorPickerOpen((v) => !v)}
                  aria-label="Ganti warna latar"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Palette className="size-4" />
                </button>
                {colorPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setColorPickerOpen(false)} />
                    <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-64 rounded-2xl p-4">
                      <HueSlider hue={hue} onChange={setHue} />
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  aria-label="Ekspor cadangan"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Download className="size-4" />
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl p-1">
                      <button
                        onClick={() => {
                          void exportBackupJson().then(() => {
                            toast.success("Cadangan JSON diunduh");
                          });
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Cadangan JSON</p>
                      </button>
                      <button
                        onClick={() => {
                          exportBackupMarkdown();
                          toast.success("Cadangan Markdown diunduh");
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Cadangan Markdown</p>
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button
                        disabled={importBusy}
                        onClick={() => {
                          setExportOpen(false);
                          importInputRef.current?.click();
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input disabled:opacity-60"
                      >
                        <p className="font-medium">
                          {importBusy ? "Memulihkan…" : "Impor cadangan JSON"}
                        </p>
                      </button>
                    </div>
                  </>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {subjects.length > 0 && (
                  <button
                    onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                    aria-label="Hapus mata kuliah"
                    className={`press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90 ${
                      selectMode ? "text-destructive" : ""
                    }`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button
                  aria-label="Cari"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Search className="size-4" />
                </button>
                <button
                  aria-label="Notifikasi"
                  className="press glass-floating relative flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
                </button>
                <Link
                  to="/auth"
                  aria-label="Akun"
                  className="press flex size-10 items-center justify-center overflow-hidden rounded-full active:scale-90"
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Foto profil"
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-full items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: profileAvatarColor }}
                    >
                      {profileInitial}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </header>

          <div className="glass-input flex items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="size-4 flex-none text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari di semua catatan…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="press-sm"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {selectMode ? `${selected.size} dipilih` : "MATA KULIAH"}
              </h2>
              <div className="flex items-center gap-2">
                {selectMode && (
                  <button
                    onClick={exitSelectMode}
                    className="press flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium active:scale-95"
                  >
                    Batal
                  </button>
                )}
                {!selectMode && (
                  <div className="relative">
                    <button
                      onClick={() => setActionHubOpen((v) => !v)}
                      aria-label="Tambah baru"
                      aria-expanded={actionHubOpen}
                      className={`press glass-floating relative flex size-9 items-center justify-center overflow-hidden rounded-full text-foreground active:scale-90 ${
                        actionHubOpen ? "bg-white/10" : ""
                      }`}
                      style={{ transition: "background-color 0.3s var(--ease-ios)" }}
                    >
                      <Plus
                        className="size-5"
                        style={{
                          transform: actionHubOpen
                            ? "rotate(135deg) scale(1.1)"
                            : "rotate(0deg) scale(1)",
                          transition: "transform 0.45s var(--ease-spring)",
                        }}
                      />
                    </button>

                    {actionHubOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActionHubOpen(false)}
                        />
                        {/* Action hub bercabang ala tree — dua opsi menjulur dari tombol + */}
                        <div className="absolute right-3 top-full z-40 pt-3">
                          <svg
                            aria-hidden="true"
                            width="88"
                            height="56"
                            viewBox="0 0 88 56"
                            className="pointer-events-none absolute -top-3 right-2 text-border"
                          >
                            <path
                              d="M 74 0 V 14 Q 74 20 68 20 H 44"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M 44 20 H 20 Q 14 20 14 26 V 40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M 44 20 H 68 Q 74 20 74 26 V 40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                          <div className="spring-in flex flex-col items-end gap-2">
                            <button
                              onClick={() => {
                                setActionHubOpen(false);
                                setComposerMode("folder");
                              }}
                              className="press glass-card flex items-center gap-2.5 rounded-2xl py-2.5 pl-3 pr-4 text-sm font-medium"
                            >
                              <span className="flex size-7 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
                                <FolderIcon className="size-3.5" />
                              </span>
                              Buat Folder
                            </button>
                            <button
                              onClick={() => {
                                setActionHubOpen(false);
                                setComposerMode("note");
                              }}
                              className="press glass-card flex items-center gap-2.5 rounded-2xl py-2.5 pl-3 pr-4 text-sm font-medium"
                            >
                              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                                <NotebookPen className="size-3.5" />
                              </span>
                              Buat Catatan
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {mainSubjects.length === 0 && folders.length === 0 && !composerMode && (
              <div className="glass-card spring-in mt-6 rounded-3xl p-10 text-center">
                <BookOpen className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Belum ada mata kuliah</p>
              </div>
            )}

            {composerMode && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onClick={() => setComposerMode(null)}
              >
                <div
                  className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-3 text-base font-semibold">
                    {composerMode === "folder" ? "Folder baru" : "Mata kuliah baru"}
                  </p>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (name.trim()) {
                          if (composerMode === "folder") createFolder(name);
                          else createSubject(name);
                        }
                        setName("");
                        setComposerMode(null);
                      }
                      if (e.key === "Escape") setComposerMode(null);
                    }}
                    placeholder={
                      composerMode === "folder" ? "Contoh: Semester 5" : "Contoh: Manajemen Risiko"
                    }
                    className="glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
                  />
                  {composerMode === "folder" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Folder belum bisa dibuka — masih tampilan awal.
                    </p>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setName("");
                        setComposerMode(null);
                      }}
                      className="press rounded-full px-4 py-2 text-sm font-medium text-muted-foreground active:scale-95"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (name.trim()) {
                          if (composerMode === "folder") createFolder(name);
                          else createSubject(name);
                        }
                        setName("");
                        setComposerMode(null);
                      }}
                      className="press rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Card Mata Kuliah Presisi & Utuh */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => {
                const isHover = hoverFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    data-folder-drop={folder.id}
                    onClick={() => setOpenFolderId(folder.id)}
                    className={`glass-soft spring-in relative flex min-h-[110px] cursor-pointer flex-col justify-between rounded-2xl p-4 ${
                      isHover ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      transition: "transform 0.18s var(--ease-spring), box-shadow 0.18s ease",
                      transform: isHover
                        ? "translateY(-6px) scale(1.04)"
                        : "translateY(0) scale(1)",
                      boxShadow: isHover
                        ? "0 0 0 4px hsl(var(--primary) / 0.18), 0 18px 30px -12px hsl(var(--primary) / 0.45)"
                        : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                        <FolderIcon className="size-4" />
                      </span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {folder.subjectIds.length} catatan
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold">{folder.name}</p>
                  </div>
                );
              })}

              {mainSubjects.map((subject) => {
                const pages = subjectPages(data, subject.id);
                const isSelected = selected.has(subject.id);
                const lastModifiedIso = pages.reduce(
                  (latest, p) => (p.updated_at > latest ? p.updated_at : latest),
                  subject.updated_at,
                );

                return (
                  <div
                    key={subject.id}
                    onPointerDown={(e) => handleCardPointerDown(e, subject.id)}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={(e) => handleCardPointerUp(e, subject.id, pages[0]?.id)}
                    onPointerCancel={finishDrag}
                    style={{
                      // "pan-y" (bukan "none"): browser tetap boleh scroll vertikal
                      // secara native di atas card, tapi gesture horizontal/long-press
                      // tetap kita yang urus lewat JS.
                      touchAction: "pan-y",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                      WebkitTouchCallout: "none",
                    }}
                    className={`press glass-soft spring-in group relative flex min-h-[110px] flex-col justify-between cursor-pointer select-none rounded-2xl p-4 transition-all hover:border-slate-700 ${
                      isSelected ? "ring-2 ring-destructive" : ""
                    } ${draggingId === subject.id ? "opacity-30" : ""}`}
                  >
                    {selectMode && (
                      <div
                        className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border bg-background/50"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    )}

                    <div>
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 size-4 flex-none text-muted-foreground" />
                        <h3 className="font-bold text-sm text-foreground leading-snug">
                          {subject.name}
                        </h3>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-muted-foreground">
                        {pages.length} pertemuan
                      </p>
                    </div>

                    <div className="mt-3 pl-6 text-[11px] text-muted-foreground/70">
                      Last modified: {formatLastModified(lastModifiedIso)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {selectMode && selected.size > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <button
                onClick={deleteSelected}
                className="press glass-floating flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground shadow-2xl active:scale-95"
              >
                <Trash2 className="size-4" /> Hapus {selected.size} mata kuliah
              </button>
            </div>
          )}
        </div>
      </div>

      {draggingSubject &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="glass-card pointer-events-none fixed z-[100] w-56 rounded-2xl p-4 shadow-2xl"
            style={{
              left: dragPos.x,
              top: dragPos.y,
              transform: "translate(-50%, -125%) scale(1.05) rotate(-2deg)",
            }}
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4 flex-none text-muted-foreground" />
              <h3 className="truncate text-sm font-bold text-foreground">{draggingSubject.name}</h3>
            </div>
          </div>,
          document.body,
        )}

      {openFolder &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setOpenFolderId(null)}
          >
            <div
              className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                    <FolderIcon className="size-4" />
                  </span>
                  <p className="truncate text-base font-semibold">{openFolder.name}</p>
                </div>
                <button
                  onClick={() => setOpenFolderId(null)}
                  aria-label="Tutup"
                  className="press-sm flex size-7 flex-none items-center justify-center rounded-full text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
                {openFolder.subjectIds.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Folder ini masih kosong. Tahan lalu seret catatan ke sini dari dashboard.
                  </p>
                )}
                {openFolder.subjectIds.map((sid) => {
                  const subj = subjects.find((s) => s.id === sid);
                  if (!subj) return null;
                  const pages = subjectPages(data, subj.id);
                  return (
                    <div
                      key={sid}
                      className="glass-soft flex items-center justify-between gap-2 rounded-2xl p-3"
                    >
                      <button
                        onClick={() => {
                          setOpenFolderId(null);
                          openSubject(subj.id, pages[0]?.id);
                        }}
                        className="press-sm flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <FileText className="size-4 flex-none text-muted-foreground" />
                        <span className="truncate text-sm font-semibold">{subj.name}</span>
                      </button>
                      <button
                        onClick={() => {
                          removeSubjectFromFolder(subj.id);
                          toast.success("Catatan dikeluarkan dari folder");
                        }}
                        aria-label="Keluarkan dari folder"
                        className="press-sm flex size-7 flex-none items-center justify-center rounded-full text-muted-foreground active:scale-90"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const count = openFolder.subjectIds.length;
                  deleteFolder(openFolder.id);
                  setOpenFolderId(null);
                  toast.success(
                    count > 0
                      ? `Folder dihapus, ${count} catatan kembali ke dashboard utama`
                      : "Folder dihapus",
                  );
                }}
                className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-semibold text-destructive active:scale-95"
              >
                <Trash2 className="size-4" /> Hapus folder
              </button>
            </div>
          </div>,
          document.body,
        )}

      <BottomNav />
    </main>
  );
}
