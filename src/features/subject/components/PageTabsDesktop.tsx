import { Check, Pin, Plus } from "lucide-react";
import type { Page } from "@/storage/local/dataCore";
import type { useDragReorder } from "@/lib/noteme/reorder";

export function PageTabsDesktop({
  tabReorder,
  activeId,
  selectMode,
  selected,
  onGoto,
  onToggleSelected,
  onCreatePage,
}: {
  tabReorder: ReturnType<typeof useDragReorder<Page>>;
  activeId: string | undefined;
  selectMode: boolean;
  selected: Set<string>;
  onGoto: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onCreatePage: () => void;
}) {
  const draggedTabPage = tabReorder.dragId
    ? tabReorder.order.find((p) => p.id === tabReorder.dragId)
    : null;

  return (
    <div className="hidden items-center gap-1.5 overflow-x-auto pb-2 md:flex">
      {tabReorder.order.map((p) => {
        const isSelected = selected.has(p.id);
        return (
          <button
            key={p.id}
            {...(selectMode ? {} : tabReorder.itemProps(p.id))}
            onClick={
              selectMode ? () => onToggleSelected(p.id) : tabReorder.guardClick(() => onGoto(p.id))
            }
            title={selectMode ? undefined : "Tahan lalu geser untuk mengubah urutan"}
            className={`press flex flex-none select-none items-center gap-1.5 rounded-full px-4 py-2 text-sm active:scale-95 ${
              !selectMode && tabReorder.isGhost(p.id) ? "invisible" : ""
            } ${
              selectMode
                ? isSelected
                  ? "bg-destructive font-medium text-destructive-foreground ring-2 ring-destructive"
                  : "glass-soft text-muted-foreground hover:text-foreground"
                : p.id === activeId
                  ? "bg-primary font-medium text-primary-foreground glow-ring"
                  : "glass-soft text-muted-foreground hover:text-foreground"
            }`}
          >
            {selectMode &&
              (isSelected ? (
                <Check className="size-3" />
              ) : (
                <span className="size-3 flex-none rounded-full border border-current" />
              ))}
            {p.pinned && <Pin className="size-3" />}
            {p.title}
          </button>
        );
      })}
      {!selectMode && (
        <button
          onClick={onCreatePage}
          aria-label="Tambah pertemuan"
          className="press glass-soft flex size-9 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <Plus className="size-4" />
        </button>
      )}
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
  );
}
