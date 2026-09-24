import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  bringToFront,
  checkpoint,
  patchNode,
  removeEdge,
  removeNodes,
  setNodePositions,
  setViewport,
  type CanvasEdge,
  type CanvasNode,
  type Side,
  type Viewport,
} from "@/lib/noteme/canvasStore";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  containedIds,
  draftPath,
  edgePath,
  findSnapTarget,
  hiddenByCollapse,
  nodeRect,
  rectsIntersect,
  type Rect,
  type Size,
  type SnapTarget,
} from "../geometry";
import { NodeView } from "../nodes";
import { FrameNodeView } from "../nodes/FrameNodeView";
import type { OnSize } from "../nodes/NodeShell";
import { PALETTE } from "../palette";

type Drag =
  | { kind: "pan"; startX: number; startY: number; vpX: number; vpY: number }
  | {
      kind: "move";
      ids: string[];
      startWorld: { x: number; y: number };
      origin: Map<string, { x: number; y: number }>;
    }
  | { kind: "marquee"; startWorld: { x: number; y: number }; current: { x: number; y: number } }
  | {
      kind: "connect";
      from: string;
      fromSide: Side;
      to: { x: number; y: number };
      snapTarget: SnapTarget | null;
    }
  | {
      kind: "resize";
      id: string;
      startWorld: { x: number; y: number };
      startSize: { w: number; h: number };
    };

export type CanvasSurfaceHandle = {
  screenToWorld: (sx: number, sy: number) => { x: number; y: number };
  viewSize: () => Size;
};

const DRAG_THRESHOLD = 3;

export function CanvasSurface({
  nodes,
  edges,
  viewport,
  selected,
  onSelect,
  editable,
  tool,
  onReady,
}: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  selected: Set<string>;
  onSelect: (ids: Set<string>) => void;
  editable: boolean;
  tool: "select" | "pan";
  onReady: (handle: CanvasSurfaceHandle) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const draggedRef = useRef(false);
  const vpRef = useRef(viewport);
  vpRef.current = viewport;

  const onSize: OnSize = useCallback((id, size) => {
    setSizes((s) => (s[id]?.w === size.w && s[id]?.h === size.h ? s : { ...s, [id]: size }));
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    const vp = vpRef.current;
    return {
      x: ((rect ? sx - rect.left : sx) - vp.x) / vp.zoom,
      y: ((rect ? sy - rect.top : sy) - vp.y) / vp.zoom,
    };
  }, []);

  useEffect(() => {
    onReady({
      screenToWorld,
      viewSize: () => {
        const r = rootRef.current?.getBoundingClientRect();
        return { w: r?.width ?? window.innerWidth, h: r?.height ?? window.innerHeight };
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenToWorld]);

  const hidden = useMemo(() => hiddenByCollapse(nodes, sizes), [nodes, sizes]);
  const rects = useMemo(() => {
    const m = new Map<string, Rect>();
    for (const n of nodes) m.set(n.id, nodeRect(n, sizes));
    return m;
  }, [nodes, sizes]);

  // ---- wheel: pan & zoom -----------------------------------------------------------------
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = vpRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const next = clamp(vp.zoom * Math.exp(-e.deltaY * 0.0018), MIN_ZOOM, MAX_ZOOM);
        const wx = (mx - vp.x) / vp.zoom;
        const wy = (my - vp.y) / vp.zoom;
        setViewport({ zoom: next, x: mx - wx * next, y: my - wy * next });
      } else {
        setViewport({ ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---- pointer handlers ------------------------------------------------------------------
  const startPan = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      vpX: viewport.x,
      vpY: viewport.y,
    });
    draggedRef.current = false;
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || e.metaKey || e.ctrlKey) {
      startPan(e);
      return;
    }
    if (!editable || tool === "pan") {
      startPan(e);
      return;
    }
    const world = screenToWorld(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ kind: "marquee", startWorld: world, current: world });
    draggedRef.current = false;
  };

  const onHandleDown = (e: React.PointerEvent, nodeId: string, side: Side) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startWorld = screenToWorld(e.clientX, e.clientY);
    setDrag({
      kind: "connect",
      from: nodeId,
      fromSide: side,
      to: startWorld,
      snapTarget: null,
    });
    draggedRef.current = true;
  };

  const onResizeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    checkpoint();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = rects.get(id) ?? { x: node.x, y: node.y, w: node.w, h: node.h ?? 180 };
    setDrag({
      kind: "resize",
      id,
      startWorld: screenToWorld(e.clientX, e.clientY),
      startSize: { w: r.w, h: r.h },
    });
    draggedRef.current = true;
  };

  const onNodeDown = (e: React.PointerEvent, nodeId: string) => {
    if (!editable || tool === "pan") return;

    // 1. Cek apakah klik berasal langsung dari handle koneksi
    const handleEl = (e.target as HTMLElement).closest("[data-handle-side]");
    if (handleEl) {
      const side = handleEl.getAttribute("data-handle-side") as Side;
      if (side) {
        onHandleDown(e, nodeId, side);
        return;
      }
    }

    // 2. Cek apakah klik berasal dari handle resize
    const resizeEl = (e.target as HTMLElement).closest("[data-resize]");
    if (resizeEl) {
      const resizeId = resizeEl.getAttribute("data-resize") || nodeId;
      onResizeDown(e, resizeId);
      return;
    }

    // 3. Hindari membajak interaksi form / tombol di dalam node
    const targetTag = (e.target as HTMLElement).tagName;
    if (
      targetTag === "INPUT" ||
      targetTag === "TEXTAREA" ||
      targetTag === "SELECT" ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a")
    ) {
      return;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.pinned) {
      if (node?.pinned) onSelect(new Set([nodeId]));
      return;
    }
    e.stopPropagation();
    bringToFront(nodeId);
    const nextSelected = selected.has(nodeId) ? selected : new Set([nodeId]);
    if (!selected.has(nodeId)) onSelect(nextSelected);
    checkpoint();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const origin = new Map<string, { x: number; y: number }>();
    for (const id of nextSelected) {
      const n = nodes.find((nn) => nn.id === id);
      if (n) origin.set(id, { x: n.x, y: n.y });
    }
    if (node.kind === "frame" && !selected.has(nodeId)) {
      for (const id of containedIds(node, nodes, sizes)) {
        const n = nodes.find((nn) => nn.id === id);
        if (n && !n.pinned) origin.set(id, { x: n.x, y: n.y });
      }
    }
    setDrag({
      kind: "move",
      ids: [...origin.keys()],
      startWorld: screenToWorld(e.clientX, e.clientY),
      origin,
    });
    draggedRef.current = false;
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (drag.kind === "pan") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) draggedRef.current = true;
        setViewport({ ...vpRef.current, x: drag.vpX + dx, y: drag.vpY + dy });
      } else if (drag.kind === "move") {
        const w = screenToWorld(e.clientX, e.clientY);
        const dx = w.x - drag.startWorld.x;
        const dy = w.y - drag.startWorld.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) draggedRef.current = true;
        const positions = new Map<string, { x: number; y: number }>();
        drag.origin.forEach((pos, id) => positions.set(id, { x: pos.x + dx, y: pos.y + dy }));
        setNodePositions(positions);
      } else if (drag.kind === "marquee") {
        draggedRef.current = true;
        setDrag({ ...drag, current: screenToWorld(e.clientX, e.clientY) });
      } else if (drag.kind === "connect") {
        const w = screenToWorld(e.clientX, e.clientY);
        // Snapping real-time di sekitar perimeter node/tabel terdekat
        const snap = findSnapTarget(w, drag.from, nodes, rects, hidden, 80);
        setDrag({ ...drag, to: w, snapTarget: snap });
      } else if (drag.kind === "resize") {
        const w = screenToWorld(e.clientX, e.clientY);
        const dw = w.x - drag.startWorld.x;
        const dh = w.y - drag.startWorld.y;
        patchNode(drag.id, {
          w: Math.max(180, Math.round(drag.startSize.w + dw)),
          h: Math.max(90, Math.round(drag.startSize.h + dh)),
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (drag.kind === "marquee") {
        const a = drag.startWorld;
        const b = drag.current;
        const box: Rect = {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          w: Math.abs(a.x - b.x),
          h: Math.abs(a.y - b.y),
        };
        if (draggedRef.current) {
          const hit = nodes.filter(
            (n) => !hidden.has(n.id) && rectsIntersect(box, rects.get(n.id)!),
          );
          onSelect(new Set(hit.map((n) => n.id)));
        } else {
          onSelect(new Set());
        }
      } else if (drag.kind === "connect") {
        const w = screenToWorld(e.clientX, e.clientY);
        // Sambungkan langsung menggunakan snapTarget aktif atau fallback koordinat kanvas
        const target = drag.snapTarget ?? findSnapTarget(w, drag.from, nodes, rects, hidden, 95);
        if (target && target.nodeId !== drag.from) {
          addEdge({
            from: drag.from,
            fromSide: drag.fromSide,
            fromRatio: 0.5,
            to: target.nodeId,
            toSide: target.side,
            toRatio: target.ratio,
          });
        }
      }
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, nodes, rects, hidden]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!editable) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      )
        return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0) {
        removeNodes([...selected]);
        onSelect(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, selected, onSelect]);

  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const marqueeBox =
    drag?.kind === "marquee"
      ? {
          x: Math.min(drag.startWorld.x, drag.current.x),
          y: Math.min(drag.startWorld.y, drag.current.y),
          w: Math.abs(drag.startWorld.x - drag.current.x),
          h: Math.abs(drag.startWorld.y - drag.current.y),
        }
      : null;

  return (
    <div
      ref={rootRef}
      onPointerDown={onBackgroundDown}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (draggedRef.current) {
          e.stopPropagation();
          draggedRef.current = false;
        }
      }}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{
        cursor: drag?.kind === "pan" ? "grabbing" : editable ? "default" : "grab",
        backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
        backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      <div className="absolute inset-0 text-slate-300 dark:text-white/10" aria-hidden="true" />
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {nodes
          .filter((n): n is Extract<CanvasNode, { kind: "frame" }> => n.kind === "frame")
          .map((f) => (
            <div key={f.id} onPointerDown={(e) => onNodeDown(e, f.id)}>
              <FrameNodeView node={f} selected={selected.has(f.id)} />
            </div>
          ))}

        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible">
          {edges.map((e) => {
            const a = rects.get(e.from);
            const b = rects.get(e.to);
            if (!a || !b || hidden.has(e.from) || hidden.has(e.to)) return null;
            const { d } = edgePath(a, e.fromSide, b, e.toSide, e.fromRatio, e.toRatio);
            return (
              <path
                key={e.id}
                d={d}
                fill="none"
                stroke="#64748b"
                strokeWidth={2}
                markerEnd="url(#canvas-arrow)"
                className="pointer-events-auto cursor-pointer"
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={() => editable && removeEdge(e.id)}
              />
            );
          })}

          {/* Garis koneksi interaktif saat ditarik */}
          {drag?.kind === "connect" && rects.get(drag.from) && (
            <>
              <path
                d={
                  drag.snapTarget
                    ? draftPath(
                        rects.get(drag.from)!,
                        drag.fromSide,
                        drag.snapTarget.point,
                        drag.snapTarget.side,
                      )
                    : draftPath(rects.get(drag.from)!, drag.fromSide, drag.to, null)
                }
                fill="none"
                stroke={PALETTE.blue.solid}
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />

              {/* Indikator Snapping Mulus & Highlight Target Node */}
              {drag.snapTarget && (
                <g className="pointer-events-none">
                  {rects.get(drag.snapTarget.nodeId) && (
                    <rect
                      x={rects.get(drag.snapTarget.nodeId)!.x - 3}
                      y={rects.get(drag.snapTarget.nodeId)!.y - 3}
                      width={rects.get(drag.snapTarget.nodeId)!.w + 6}
                      height={rects.get(drag.snapTarget.nodeId)!.h + 6}
                      rx={18}
                      fill="none"
                      stroke={PALETTE.blue.solid}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      className="opacity-70 animate-pulse"
                    />
                  )}
                  {/* Lingkaran luar snap yang berkedip halus */}
                  <circle
                    cx={drag.snapTarget.point.x}
                    cy={drag.snapTarget.point.y}
                    r={9}
                    fill="rgba(59, 130, 246, 0.25)"
                    stroke={PALETTE.blue.solid}
                    strokeWidth={2}
                  />
                  {/* Titik pusat snap */}
                  <circle
                    cx={drag.snapTarget.point.x}
                    cy={drag.snapTarget.point.y}
                    r={4}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </g>
              )}
            </>
          )}

          <defs>
            <marker
              id="canvas-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
            </marker>
          </defs>
        </svg>

        {visibleNodes
          .filter((n) => n.kind !== "frame")
          .map((n) => (
            <div key={n.id} onPointerDown={(e) => onNodeDown(e, n.id)}>
              <NodeView node={n} selected={selected.has(n.id)} onSize={onSize} />
              {selected.has(n.id) && editable && !n.pinned && n.kind !== "sticky" && (
                <ResizeCorner rect={rects.get(n.id)!} onDown={(e) => onResizeDown(e, n.id)} />
              )}
              {selected.has(n.id) && editable && !n.pinned && (
                <HandleLayer id={n.id} rect={rects.get(n.id)!} onDown={onHandleDown} />
              )}
            </div>
          ))}

        {marqueeBox && (
          <div
            className="absolute rounded-md border-2 border-primary bg-primary/10"
            style={{
              left: marqueeBox.x,
              top: marqueeBox.y,
              width: marqueeBox.w,
              height: marqueeBox.h,
            }}
          />
        )}
      </div>
    </div>
  );
}

function HandleLayer({
  id,
  rect,
  onDown,
}: {
  id: string;
  rect: Rect;
  onDown: (e: React.PointerEvent, id: string, side: Side) => void;
}) {
  const pos: Record<Side, { left: number; top: number }> = {
    top: { left: rect.w / 2 - 8, top: -8 },
    bottom: { left: rect.w / 2 - 8, top: rect.h - 8 },
    left: { left: -8, top: rect.h / 2 - 8 },
    right: { left: rect.w - 8, top: rect.h / 2 - 8 },
  };
  return (
    <>
      {(["top", "right", "bottom", "left"] as Side[]).map((side) => (
        <span
          key={side}
          data-handle-node={id}
          data-handle-side={side}
          onPointerDown={(e) => onDown(e, id, side)}
          className="absolute z-20 size-4 cursor-crosshair rounded-full"
          style={{ left: rect.x + pos[side].left, top: rect.y + pos[side].top }}
        />
      ))}
    </>
  );
}

function ResizeCorner({ rect, onDown }: { rect: Rect; onDown: (e: React.PointerEvent) => void }) {
  return (
    <span
      onPointerDown={onDown}
      className="absolute z-20 size-4 cursor-nwse-resize rounded-full border-2 border-primary bg-white shadow"
      style={{ left: rect.x + rect.w - 8, top: rect.y + rect.h - 8 }}
    />
  );
}
