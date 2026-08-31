import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * Long-press-then-drag reordering, iOS-icon-jiggle style. Works for a
 * horizontal row (axis "x") or a vertical list (axis "y") of items.
 *
 * The dragged item's slot stays in the flow (hidden via `isGhost`) while a
 * floating clone (positioned with `overlayStyle`) follows the pointer along
 * the chosen axis only. Other items are never transformed — they just
 * re-flow instantly when `order` changes — so there's no drift between the
 * clone's position and the underlying layout.
 *
 * A tap (pointerdown -> pointerup with no meaningful movement, or released
 * before the long-press fires) is left alone so the item's normal onClick
 * still runs; wrap click handlers passed to consumers with `guardClick`.
 */

type Item = { id: string };

type Options<T extends Item> = {
  items: T[];
  axis: "x" | "y";
  /** Items only reorder among others sharing the same group (e.g. pinned vs not). */
  groupKey?: (item: T) => string | number | boolean;
  onCommit: (orderedIds: string[]) => void;
  longPressMs?: number;
  moveCancelThreshold?: number;
};

export function useDragReorder<T extends Item>({
  items,
  axis,
  groupKey = () => 0,
  onCommit,
  longPressMs = 260,
  moveCancelThreshold = 8,
}: Options<T>) {
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  const orderRef = useRef(items);
  const draggingRef = useRef(false);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const pressTimer = useRef<number | undefined>(undefined);
  const downPoint = useRef({ x: 0, y: 0 });
  const grabOffset = useRef({ x: 0, y: 0 });
  const dragSize = useRef({ width: 0, height: 0 });
  const originRect = useRef({ left: 0, top: 0 });
  const activePointerId = useRef<number | null>(null);
  const suppressNextClick = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) {
      orderRef.current = items;
      setOrder(items);
    }
  }, [items]);

  const clearPressTimer = () => {
    if (pressTimer.current !== undefined) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = undefined;
    }
  };

  const registerItemRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(id, el);
      else itemRefs.current.delete(id);
    },
    [],
  );

  const finishDrag = useCallback(
    (commit: boolean) => {
      clearPressTimer();
      if (commit) {
        suppressNextClick.current = true;
        onCommit(orderRef.current.map((i) => i.id));
      }
      draggingRef.current = false;
      activePointerId.current = null;
      setDragId(null);
    },
    [onCommit],
  );

  const recomputeOrder = useCallback(
    (id: string, coord: number) => {
      const current = orderRef.current;
      const group = groupKey(current.find((i) => i.id === id) as T);
      const slots = current
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => groupKey(item) === group);

      const centers = slots.map(({ item }) => {
        if (item.id === id) return { id: item.id, c: coord };
        const el = itemRefs.current.get(item.id);
        const rect = el?.getBoundingClientRect();
        const c = rect
          ? axis === "x"
            ? (rect.left + rect.right) / 2
            : (rect.top + rect.bottom) / 2
          : 0;
        return { id: item.id, c };
      });
      centers.sort((a, b) => a.c - b.c);

      const next = current.slice();
      slots.forEach(({ index }, i) => {
        next[index] = current.find((it) => it.id === centers[i]!.id)!;
      });

      const changed = next.some((it, i) => it.id !== current[i]!.id);
      if (changed) {
        orderRef.current = next;
        setOrder(next);
      }
    },
    [axis, groupKey],
  );

  const beginDrag = useCallback((id: string) => {
    const el = itemRefs.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    grabOffset.current = { x: downPoint.current.x - rect.left, y: downPoint.current.y - rect.top };
    dragSize.current = { width: rect.width, height: rect.height };
    originRect.current = { left: rect.left, top: rect.top };
    draggingRef.current = true;
    setDragId(id);
    setPointerPos({ x: downPoint.current.x, y: downPoint.current.y });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(8);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;

      if (!draggingRef.current) {
        const dx = e.clientX - downPoint.current.x;
        const dy = e.clientY - downPoint.current.y;
        if (Math.hypot(dx, dy) > moveCancelThreshold) {
          clearPressTimer();
        }
        return;
      }

      e.preventDefault();
      const x = axis === "x" ? e.clientX : downPoint.current.x;
      const y = axis === "y" ? e.clientY : downPoint.current.y;
      setPointerPos({ x, y });
      const id = dragId;
      if (!id) return;
      const coord =
        axis === "x"
          ? e.clientX - grabOffset.current.x + dragSize.current.width / 2
          : e.clientY - grabOffset.current.y + dragSize.current.height / 2;
      recomputeOrder(id, coord);
    };

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;
      if (draggingRef.current) finishDrag(true);
      else clearPressTimer();
      activePointerId.current = null;
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [axis, dragId, finishDrag, moveCancelThreshold, recomputeOrder]);

  const onPointerDown = useCallback(
    (id: string) => (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      activePointerId.current = e.pointerId;
      downPoint.current = { x: e.clientX, y: e.clientY };
      clearPressTimer();
      pressTimer.current = window.setTimeout(() => beginDrag(id), longPressMs);
    },
    [beginDrag, longPressMs],
  );

  const guardClick = useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (suppressNextClick.current) {
          suppressNextClick.current = false;
          return;
        }
        fn(...args);
      },
    [],
  );

  const overlayStyle: CSSProperties | undefined = dragId
    ? {
        position: "fixed",
        left: pointerPos.x - grabOffset.current.x,
        top: pointerPos.y - grabOffset.current.y,
        width: dragSize.current.width,
        height: dragSize.current.height,
        zIndex: 60,
        pointerEvents: "none",
        touchAction: "none",
      }
    : undefined;

  return {
    order,
    dragId,
    overlayStyle,
    isGhost: (id: string) => id === dragId,
    itemProps: (id: string) => ({
      ref: registerItemRef(id),
      onPointerDown: onPointerDown(id),
      style: { touchAction: "manipulation" as const },
    }),
    guardClick,
  };
}
