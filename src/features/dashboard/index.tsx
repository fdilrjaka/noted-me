import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  FileText,
  Folder as FolderIcon,
  NotebookPen,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { BrandMark } from "@/components/noteme/BrandMark";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { useSession } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { activeSubjects, search, subjectPages, useData } from "@/storage/local/dataCore";
import { SearchBar } from "./components/SearchBar";
import { NotificationPanel } from "./components/NotificationPanel";
import { useSelection } from "./hooks/useSelection";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useComposer } from "./hooks/useComposer";
import { useFolderView } from "./hooks/useFolderView";
import { useNotifications } from "./hooks/useNotifications";

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
  const [notifOpen, setNotifOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const notifications = useNotifications();
  const {
    folders,
    openFolderId,
    setOpenFolderId,
    openFolder,
    closeFolder,
    handleDeleteFolder,
    handleRemoveFromFolder,
  } = useFolderView();
  const composer = useComposer();
  const { selectMode, selected, toggleSelectMode, toggleSelected, exitSelectMode, deleteSelected } =
    useSelection();

  const subjects = useMemo(() => activeSubjects(data), [data]);
  const folderedIds = useMemo(() => new Set(folders.flatMap((f) => f.subjectIds)), [folders]);
  const mainSubjects = useMemo(
    () => subjects.filter((s) => !folderedIds.has(s.id)),
    [subjects, folderedIds],
  );

  const searchHits = useMemo(() => search(data, query), [data, query]);

  const openSubject = (subjectId: string, pageId: string | undefined) => {
    void navigate({
      to: "/subject/$subjectId",
      params: { subjectId },
      search: { page: pageId },
    });
  };

  const {
    draggingId,
    dragPos,
    hoverFolderId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    finishDrag,
  } = useDragAndDrop({ selectMode, onToggleSelect: toggleSelected, onOpenSubject: openSubject });

  const draggingSubject = draggingId ? subjects.find((s) => s.id === draggingId) : null;

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
              <Link
                to="/settings"
                aria-label="Pengaturan"
                className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
              >
                <Settings className="size-4" />
              </Link>

              <div className="hidden items-center gap-2 md:flex">
                {subjects.length > 0 && (
                  <button
                    onClick={toggleSelectMode}
                    aria-label="Hapus mata kuliah"
                    className={`press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90 ${
                      selectMode ? "text-destructive" : ""
                    }`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <NotificationPanel
                  notifications={notifications}
                  open={notifOpen}
                  onToggle={() => setNotifOpen((v) => !v)}
                  onClose={() => setNotifOpen(false)}
                />
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

          <SearchBar
            query={query}
            onQueryChange={setQuery}
            searchHits={searchHits}
            onOpenHit={(subjectId, pageId) => {
              setQuery("");
              openSubject(subjectId, pageId);
            }}
          />

          {!query.trim() && (
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
                                  composer.open("folder");
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
                                  composer.open("note");
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

              {mainSubjects.length === 0 && folders.length === 0 && !composer.composerMode && (
                <div className="glass-card spring-in mt-6 rounded-3xl p-10 text-center">
                  <BookOpen className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-semibold">Belum ada mata kuliah</p>
                </div>
              )}

              {composer.composerMode && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                  onClick={composer.close}
                >
                  <div
                    className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="mb-3 text-base font-semibold">
                      {composer.composerMode === "folder" ? "Folder baru" : "Mata kuliah baru"}
                    </p>
                    <input
                      autoFocus
                      value={composer.name}
                      onChange={(e) => composer.setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") composer.submit();
                        if (e.key === "Escape") composer.close();
                      }}
                      placeholder={
                        composer.composerMode === "folder"
                          ? "Contoh: Semester 5"
                          : "Contoh: Manajemen Risiko"
                      }
                      className="glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
                    />
                    {composer.composerMode === "folder" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Folder belum bisa dibuka — masih tampilan awal.
                      </p>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={composer.close}
                        className="press rounded-full px-4 py-2 text-sm font-medium text-muted-foreground active:scale-95"
                      >
                        Batal
                      </button>
                      <button
                        onClick={composer.submit}
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
                      onPointerDown={(e) => handlePointerDown(e, subject.id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={(e) => handlePointerUp(e, subject.id, pages[0]?.id)}
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
          )}

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
            onClick={closeFolder}
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
                  onClick={closeFolder}
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
                          closeFolder();
                          openSubject(subj.id, pages[0]?.id);
                        }}
                        className="press-sm flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <FileText className="size-4 flex-none text-muted-foreground" />
                        <span className="truncate text-sm font-semibold">{subj.name}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveFromFolder(subj.id)}
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
                onClick={() => handleDeleteFolder(openFolder)}
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
