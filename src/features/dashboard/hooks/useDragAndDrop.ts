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
  lastY: number;
  timer: number | null;
  longPressed: boolean;
  scrolling: boolean;
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
      lastY: e.clientY,
      scrolling: false,
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

    if (state.longPressed) {
      e.preventDefault();
      setDragPos({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const folderEl = el?.closest("[data-folder-drop]") as HTMLElement | null;
      const nextHover = folderEl?.dataset["folderDrop"] ?? null;
      state.hoverFolderId = nextHover;
      setHoverFolderId(nextHover);
      return;
    }

    // Card pakai touchAction:"none" (lihat index.tsx) supaya browser gak
    // rebutan gesture sama timer long-press kita — jadi begitu gerakan
    // jari melewati threshold SEBELUM long-press kepicu, itu tandanya niat
    // scroll (bukan drag), dan karena native scroll diblokir touch-action:
    // none, kita yang gulung layarnya manual di sini.
    if (state.scrolling) {
      const deltaY = state.lastY - e.clientY;
      window.scrollBy(0, deltaY);
      state.lastY = e.clientY;
      return;
    }

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      clearDragTimer();
      state.scrolling = true;
      state.lastY = e.clientY;
      window.scrollBy(0, state.startY - e.clientY);
    }
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
    } else if (state.scrolling) {
      // Ini akhir dari gesture scroll manual (bukan tap, bukan drag) —
      // jangan buka subject atau toggle select.
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
