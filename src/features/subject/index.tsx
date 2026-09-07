import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, CheckSquare, Images, Menu, X } from "lucide-react";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { extractImages, subjectPages, useData } from "@/storage/local/dataCore";
import { createPage, deletePage, patchPage, reorderPages } from "@/storage/local/pageStore";
import { patchSubject } from "@/storage/local/subjectStore";
import { useDragReorder } from "@/lib/noteme/reorder";
import { usePageSelection } from "./hooks/usePageSelection";
import { PageTabsDesktop } from "./components/PageTabsDesktop";
import { PageSidebarMobile } from "./components/PageSidebarMobile";
import { PageEditorPanel } from "./components/PageEditorPanel";
import { ImageGalleryModal } from "./components/ImageGalleryModal";

export function SubjectView({ subjectId, pageParam }: { subjectId: string; pageParam?: string }) {
  const navigate = useNavigate();
  const data = useData();
  const [sidebar, setSidebar] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const selection = usePageSelection();
  const { selectMode, selected, toggleSelected, setSelectMode, exitSelectMode } = selection;

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
    void navigate({ to: "/subject/$subjectId", params: { subjectId }, search: { page: id } });
  };

  const swipe = (dir: -1 | 1) => {
    if (!activeId) return;
    const idx = pages.findIndex((p) => p.id === activeId);
    const next = pages[idx + dir];
    if (next) goto(next.id);
  };

  const handleDeleteSelected = () =>
    selection.deleteSelectedPages(activeId, pages, (nextId) => goto(nextId));

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
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          aria-label={selectMode ? "Batal pilih" : "Pilih pertemuan"}
          className={`press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90 ${
            selectMode ? "text-destructive" : ""
          }`}
        >
          {selectMode ? <X className="size-4" /> : <CheckSquare className="size-4" />}
        </button>
        <button
          onClick={() => setGallery(true)}
          aria-label="Galeri gambar"
          className="press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <Images className="size-4" />
        </button>
      </header>

      {selectMode && (
        <div className="mb-2 flex items-center justify-between rounded-2xl bg-input px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} dipilih</span>
          <button onClick={exitSelectMode} className="press-sm text-muted-foreground">
            Batal
          </button>
        </div>
      )}

      <PageTabsDesktop
        tabReorder={tabReorder}
        activeId={activeId}
        selectMode={selectMode}
        selected={selected}
        onGoto={goto}
        onToggleSelected={toggleSelected}
        onCreatePage={() => goto(createPage(subjectId))}
      />

      {selectMode && selected.size > 0 && (
        <div className="mb-2 hidden md:flex">
          <button
            onClick={handleDeleteSelected}
            className="press flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground active:scale-95"
          >
            Hapus {selected.size} pertemuan
          </button>
        </div>
      )}

      {active && !selectMode && (
        <PageEditorPanel
          active={active}
          renaming={renaming}
          draftTitle={draftTitle}
          onStartRename={() => {
            setDraftTitle(active.title);
            setRenaming(active.id);
          }}
          onDraftTitleChange={setDraftTitle}
          onFinishRename={() => {
            patchPage(active.id, { title: draftTitle.trim() || active.title });
            setRenaming(null);
          }}
          onDelete={() => {
            deletePage(active.id);
            const rest = pages.filter((p) => p.id !== active.id);
            if (rest[0]) goto(rest[0].id);
          }}
          onSwipe={swipe}
        />
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

      {sidebar && (
        <PageSidebarMobile
          sidebarReorder={sidebarReorder}
          activeId={activeId}
          selectMode={selectMode}
          selected={selected}
          onGoto={goto}
          onToggleSelected={toggleSelected}
          onSetSelectMode={() => setSelectMode(true)}
          onExitSelectMode={exitSelectMode}
          onCreatePage={() => goto(createPage(subjectId))}
          onDeleteSelected={handleDeleteSelected}
          onClose={() => setSidebar(false)}
        />
      )}

      {gallery && <ImageGalleryModal images={images} onClose={() => setGallery(false)} />}
    </main>
  );
}
