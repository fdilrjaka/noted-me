import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { assignSubjectToFolder } from "@/lib/noteme/folderStore";

const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  timer: number | null;
  longPressed: boolean;
  hoverFolderId: string | null;
};

/**
 * Long-press + drag kartu mata kuliah di dashboard ke atas folder buat masukin ke
 * situ. Dipisah dari Dashboard karena logikanya (pointer capture, timer long-press,
 * deteksi folder di bawah kursor) gak nyambung sama sekali ke render/JSX-nya.
 */
export function useDragAndDrop(opts: {
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenSubject: (subjectId: string, firstPageId: string | undefined) => void;
}) {
  const { selectMode, onToggleSelect, onOpenSubject } = opts;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverFolderId, setHoverFolderId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const clearDragTimer = () => {
    if (dragStateRef.current?.timer) window.clearTimeout(dragStateRef.current.timer);
  };

  const handlePointerDown = (e: ReactPointerEvent, subjectId: string) => {
    if (e.button === 2) return;
    // Pointer capture memastikan pointermove/pointerup TETAP terkirim ke card
    // ini walau jari/kursor sudah bergerak ke atas elemen lain (mis. folder).
    // Tanpa ini, event lepas jari bisa "nyasar" ke elemen di bawahnya dan
    // drag jadi tidak pernah selesai (ghost mengambang terus).
    e.currentTarget.setPointerCapture(e.pointerId);
    // Saat selectMode aktif, tap hanya untuk toggle pilihan — tidak perlu
    // drag/long-press ke folder, jadi timer-nya dilewati saja (timer: null).
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

  const handlePointerMove = (e: ReactPointerEvent) => {
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

  const handlePointerUp = (
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
      if (selectMode) onToggleSelect(subjectId);
      else onOpenSubject(subjectId, firstPageId);
    }
  };

  return {
    draggingId,
    dragPos,
    hoverFolderId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    finishDrag,
  };
}
