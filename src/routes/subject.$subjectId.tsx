import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Download,
  Images,
  Menu,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Editor } from "@/components/noteme/Editor";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { exportPageJson, exportPageMarkdown, exportPagePdf } from "@/lib/noteme/backup";
import {
  createPage,
  deletePage,
  extractImages,
  patchPage,
  patchSubject,
  reorderPages,
  subjectPages,
  useData,
} from "@/lib/noteme/store";
import { useDragReorder } from "@/lib/noteme/reorder";

export const Route = createFileRoute("/subject/$subjectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: typeof search["page"] === "string" ? (search["page"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catatan Mata Kuliah — NoteMe" },
      {
        name: "description",
        content:
          "Tulis catatan per pertemuan dengan editor teks kaya, foto, tabel, dan checklist di NoteMe.",
      },
      { property: "og:title", content: "Catatan Mata Kuliah — NoteMe" },
      {
        property: "og:description",
        content: "Halaman pertemuan dengan editor teks kaya, gambar, dan auto-save.",
      },
    ],
  }),
  component: SubjectView,
});

function SubjectView() {
  const { subjectId } = Route.useParams();
  const searchParams = Route.useSearch();
  const pageParam = searchParams.page;
  const navigate = useNavigate();
  const data = useData();
  const [sidebar, setSidebar] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const subject = data.subjects.find((s) => s.id === subjectId && !s.deleted);
  const pages = useMemo(() => subjectPages(data, subjectId), [data, subjectId]);
  const activeId = pageParam && pages.some((p) => p.id === pageParam) ? pageParam : pages[0]?.id;
  const active = pages.find((p) => p.id === activeId);

  const tabReorder = useDragReorder({
    items: pages,
    axis: "x",
    groupKey: (p) => p.pinned,
    onCommit: (ids) => reorderPages(subjectId, ids),
  });
  const sidebarReorder = useDragReorder({
    items: pages,
    axis: "y",
    groupKey: (p) => p.pinned,
    onCommit: (ids) => reorderPages(subjectId, ids),
  });
  const draggedTabPage = tabReorder.dragId ? pages.find((p) => p.id === tabReorder.dragId) : null;
  const draggedSidebarPage = sidebarReorder.dragId
    ? pages.find((p) => p.id === sidebarReorder.dragId)
    : null;

  useEffect(() => {
    if (activeId && activeId !== pageParam) {
      void navigate({
        to: "/subject/$subjectId",
        params: { subjectId },
        search: { page: activeId },
        replace: true,
      });
    }
  }, [activeId, pageParam, subjectId, navigate]);

  if (!subject) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 text-center">
          <p className="font-semibold">Mata kuliah tidak ditemukan</p>
          <Link
            to="/"
            className="press glass-floating spring-in mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-foreground active:scale-95"
          >
            <ChevronLeft className="size-4" />
            Kembali ke dashboard
          </Link>
        </div>
      </main>
    );
  }

  const goto = (id: string) => {
    setSidebar(false);
    void navigate({
      to: "/subject/$subjectId",
      params: { subjectId },
      search: { page: id },
    });
  };

  const swipe = (dir: -1 | 1) => {
    if (!activeId) return;
    const idx = pages.findIndex((p) => p.id === activeId);
    const next = pages[idx + dir];
    if (next) goto(next.id);
  };

  const images = active ? extractImages(active.content) : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 safe-top safe-bottom md:px-6">
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label="Kembali"
          className="press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <button
          onClick={() => setSidebar(true)}
          aria-label="Daftar pertemuan"
          className="press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90 md:hidden"
        >
          <Menu className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={subject.name}
            onChange={(e) => patchSubject(subject.id, { name: e.target.value })}
            className="w-full truncate bg-transparent text-lg font-bold tracking-tight outline-none"
          />
          <SyncStatus />
        </div>
        <button
          onClick={() => setGallery(true)}
          aria-label="Galeri gambar"
          className="press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <Images className="size-4" />
        </button>
      </header>

      {/* Laptop: horizontal tabs — tahan lalu geser kanan/kiri untuk mengubah urutan */}
      <div className="hidden items-center gap-1.5 overflow-x-auto pb-2 md:flex">
        {tabReorder.order.map((p) => (
          <button
            key={p.id}
            {...tabReorder.itemProps(p.id)}
            onClick={tabReorder.guardClick(() => goto(p.id))}
            title="Tahan lalu geser untuk mengubah urutan"
            className={`press flex flex-none select-none items-center gap-1.5 rounded-full px-4 py-2 text-sm active:scale-95 ${
              tabReorder.isGhost(p.id) ? "invisible" : ""
            } ${
              p.id === activeId
                ? "bg-primary font-medium text-primary-foreground glow-ring"
                : "glass-soft text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.pinned && <Pin className="size-3" />}
            {p.title}
          </button>
        ))}
        <button
          onClick={() => goto(createPage(subjectId))}
          aria-label="Tambah pertemuan"
          className="press glass-soft flex size-9 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <Plus className="size-4" />
        </button>
        {draggedTabPage && (
          <div
            style={tabReorder.overlayStyle}
            className="glass-floating flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-2xl"
          >
            {draggedTabPage.pinned && <Pin className="size-3" />}
            {draggedTabPage.title}
          </div>
        )}
      </div>

      {active && (
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
            if (Math.abs(dx) > 70 && Math.abs(dy) < 50) swipe(dx < 0 ? 1 : -1);
            touchStart.current = null;
          }}
        >
          <div className="flex items-start gap-2 pb-2 md:pb-4">
            {renaming === active.id ? (
              <input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => {
                  patchPage(active.id, { title: draftTitle.trim() || active.title });
                  setRenaming(null);
                }}
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
                onClick={() => {
                  setDraftTitle(active.title);
                  setRenaming(active.id);
                }}
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
              <div className="relative">
                <button
                  aria-label="Ekspor pertemuan ini"
                  onClick={() => setExportOpen((v) => !v)}
                  className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
                >
                  <Download className="size-3.5" />
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl p-1">
                      <button
                        onClick={() => {
                          void exportPageJson(active.id).then(() => {
                            toast.success("Pertemuan diekspor sebagai JSON");
                          });
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Ekspor JSON</p>
                        <p className="text-xs text-muted-foreground">
                          Lengkap, bisa dipulihkan lagi
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          exportPageMarkdown(active.id);
                          toast.success("Pertemuan diekspor sebagai Markdown");
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Ekspor Markdown</p>
                        <p className="text-xs text-muted-foreground">Teks saja, mudah dibaca</p>
                      </button>
                      <button
                        onClick={() => {
                          void exportPagePdf(active.id).then(() => {
                            toast.success("Pertemuan diekspor sebagai PDF");
                          });
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Ekspor PDF</p>
                        <p className="text-xs text-muted-foreground">Langsung ke-download</p>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <span className="mx-0.5 h-5 w-px flex-none bg-border" aria-hidden="true" />
              <button
                aria-label="Pindahkan ke trash"
                onClick={() => {
                  deletePage(active.id);
                  const rest = pages.filter((p) => p.id !== active.id);
                  if (rest[0]) goto(rest[0].id);
                }}
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
      )}

      {!active && (
        <div className="glass-card mt-4 rounded-3xl p-10 text-center">
          <p className="font-semibold">Belum ada pertemuan</p>
          <button
            onClick={() => goto(createPage(subjectId))}
            className="press mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground active:scale-95"
          >
            Tambah Pertemuan
          </button>
        </div>
      )}

      {/* iPhone: sidebar sheet */}
      {sidebar && (
        <div
          className="fade-in-ios fixed inset-0 z-40 flex bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebar(false)}
        >
          <aside
            className="glass-sheet slide-in-left h-full w-[78%] max-w-xs overflow-y-auto border-r p-4 safe-top safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">Pertemuan</p>
              <button onClick={() => setSidebar(false)} aria-label="Tutup" className="press-sm">
                <X className="size-4" />
              </button>
            </div>
            <div className="relative mt-4 space-y-1.5">
              {sidebarReorder.order.map((p) => (
                <button
                  key={p.id}
                  {...sidebarReorder.itemProps(p.id)}
                  onClick={sidebarReorder.guardClick(() => goto(p.id))}
                  className={`press flex w-full select-none items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm active:scale-[0.98] ${
                    sidebarReorder.isGhost(p.id) ? "invisible" : ""
                  } ${p.id === activeId ? "bg-primary text-primary-foreground" : "bg-input"}`}
                >
                  {p.pinned && <Pin className="size-3 flex-none" />}
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
              {draggedSidebarPage && (
                <div
                  style={sidebarReorder.overlayStyle}
                  className="glass-floating flex w-[calc(78vw-2rem)] max-w-[19rem] items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm shadow-2xl"
                >
                  {draggedSidebarPage.pinned && <Pin className="size-3 flex-none" />}
                  <span className="truncate">{draggedSidebarPage.title}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => goto(createPage(subjectId))}
              className="press mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border py-2.5 text-sm active:scale-95"
            >
              <Plus className="size-4" /> Pertemuan baru
            </button>
          </aside>
        </div>
      )}

      {gallery && (
        <div className="fade-in-ios fixed inset-0 z-40 flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center">
          <div className="glass-sheet sheet-up max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 safe-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Galeri gambar</h3>
              <button onClick={() => setGallery(false)} aria-label="Tutup" className="press-sm">
                <X className="size-4" />
              </button>
            </div>
            {images.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada gambar di halaman ini.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Gambar catatan ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl border border-border object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
