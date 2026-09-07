import { Check, Pin, Plus, Trash2, X } from "lucide-react";
import type { Page } from "@/storage/local/dataCore";
import type { useDragReorder } from "@/lib/noteme/reorder";

export function PageSidebarMobile({
  sidebarReorder,
  activeId,
  selectMode,
  selected,
  onGoto,
  onToggleSelected,
  onSetSelectMode,
  onExitSelectMode,
  onCreatePage,
  onDeleteSelected,
  onClose,
}: {
  sidebarReorder: ReturnType<typeof useDragReorder<Page>>;
  activeId: string | undefined;
  selectMode: boolean;
  selected: Set<string>;
  onGoto: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onSetSelectMode: () => void;
  onExitSelectMode: () => void;
  onCreatePage: () => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}) {
  const draggedSidebarPage = sidebarReorder.dragId
    ? sidebarReorder.order.find((p) => p.id === sidebarReorder.dragId)
    : null;

  return (
    <div
      className="fade-in-ios fixed inset-0 z-40 flex bg-background/60 backdrop-blur-sm md:hidden"
      onClick={onClose}
    >
      <aside
        className="glass-sheet slide-in-left h-full w-[78%] max-w-xs overflow-y-auto border-r p-4 safe-top safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold">{selectMode ? `${selected.size} dipilih` : "Pertemuan"}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={selectMode ? onExitSelectMode : onSetSelectMode}
              aria-label={selectMode ? "Batal pilih" : "Pilih pertemuan"}
              className={`press-sm text-xs font-medium ${selectMode ? "text-destructive" : "text-muted-foreground"}`}
            >
              {selectMode ? "Batal" : "Pilih"}
            </button>
            <button onClick={onClose} aria-label="Tutup" className="press-sm">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="relative mt-4 space-y-1.5">
          {sidebarReorder.order.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                {...(selectMode ? {} : sidebarReorder.itemProps(p.id))}
                onClick={
                  selectMode ? () => onToggleSelected(p.id) : sidebarReorder.guardClick(() => onGoto(p.id))
                }
                className={`press flex w-full select-none items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm active:scale-[0.98] ${
                  !selectMode && sidebarReorder.isGhost(p.id) ? "invisible" : ""
                } ${
                  selectMode
                    ? isSelected
                      ? "bg-destructive text-destructive-foreground ring-2 ring-destructive"
                      : "bg-input"
                    : p.id === activeId
                      ? "bg-primary text-primary-foreground"
                      : "bg-input"
                }`}
              >
                {selectMode &&
                  (isSelected ? (
                    <Check className="size-3.5 flex-none" />
                  ) : (
                    <span className="size-3.5 flex-none rounded-full border border-current" />
                  ))}
                {p.pinned && <Pin className="size-3 flex-none" />}
                <span className="truncate">{p.title}</span>
              </button>
            );
          })}
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
        {!selectMode && (
          <button
            onClick={onCreatePage}
            className="press mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border py-2.5 text-sm active:scale-95"
          >
            <Plus className="size-4" /> Pertemuan baru
          </button>
        )}
        {selectMode && selected.size > 0 && (
          <button
            onClick={onDeleteSelected}
            className="press mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground active:scale-95"
          >
            <Trash2 className="size-4" /> Hapus {selected.size} pertemuan
          </button>
        )}
      </aside>
    </div>
  );
}
