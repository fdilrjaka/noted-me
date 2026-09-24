import { useCallback, useMemo, useRef } from "react";
import type { CanvasNode, Viewport } from "@/lib/noteme/canvasStore";
import { X } from "lucide-react";
import { boundsOf, clamp, nodeRect, type Size } from "../geometry";
import { PALETTE } from "../palette";

const MAP_W = 210;
const MAP_H = 140;
const PAD = 100;

export function MiniMap({
  nodes,
  sizes,
  viewport,
  viewSize,
  onJump,
  onClose,
}: {
  nodes: CanvasNode[];
  sizes: Record<string, Size>;
  viewport: Viewport;
  viewSize: Size;
  onJump: (viewport: Viewport) => void;
  onClose: () => void;
}) {
  const isDraggingRef = useRef(false);

  // Hitung bounding box canvas yang mencakup node dan viewport saat ini
  const bounds = useMemo(() => {
    const allRects = nodes.map((n) => nodeRect(n, sizes));
    const vpWorldRect = {
      x: -viewport.x / viewport.zoom,
      y: -viewport.y / viewport.zoom,
      w: viewSize.w / viewport.zoom,
      h: viewSize.h / viewport.zoom,
    };
    const b = boundsOf([...allRects, vpWorldRect]);
    if (!b) return { x: 0, y: 0, w: 1200, h: 800 };
    return {
      x: b.x - PAD,
      y: b.y - PAD,
      w: Math.max(b.w + PAD * 2, 800),
      h: Math.max(b.h + PAD * 2, 500),
    };
  }, [nodes, sizes, viewport, viewSize]);

  const scale = Math.min(MAP_W / bounds.w, MAP_H / bounds.h);
  const offsetX = (MAP_W - bounds.w * scale) / 2;
  const offsetY = (MAP_H - bounds.h * scale) / 2;

  const toMap = useCallback(
    (wx: number, wy: number) => ({
      x: offsetX + (wx - bounds.x) * scale,
      y: offsetY + (wy - bounds.y) * scale,
    }),
    [bounds, scale, offsetX, offsetY],
  );

  const viewportBox = useMemo(() => {
    const topLeft = { x: -viewport.x / viewport.zoom, y: -viewport.y / viewport.zoom };
    const p0 = toMap(topLeft.x, topLeft.y);
    return {
      x: p0.x,
      y: p0.y,
      w: (viewSize.w / viewport.zoom) * scale,
      h: (viewSize.h / viewport.zoom) * scale,
    };
  }, [viewport, viewSize, scale, toMap]);

  const handlePointer = useCallback(
    (clientX: number, clientY: number, svgEl: SVGSVGElement) => {
      const rect = svgEl.getBoundingClientRect();
      const mx = clientX - rect.left - offsetX;
      const my = clientY - rect.top - offsetY;
      const wx = bounds.x + mx / scale;
      const wy = bounds.y + my / scale;
      onJump({
        zoom: viewport.zoom,
        x: viewSize.w / 2 - wx * viewport.zoom,
        y: viewSize.h / 2 - wy * viewport.zoom,
      });
    },
    [bounds, scale, offsetX, offsetY, viewport.zoom, viewSize, onJump],
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    const svgEl = e.currentTarget;
    svgEl.setPointerCapture(e.pointerId);
    handlePointer(e.clientX, e.clientY, svgEl);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    handlePointer(e.clientX, e.clientY, e.currentTarget);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const frames = nodes.filter((n) => n.kind === "frame");
  const regularNodes = nodes.filter((n) => n.kind !== "frame");

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:border-white/5">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          Mini-map
        </span>
        <button
          type="button"
          aria-label="Sembunyikan mini-map"
          onClick={onClose}
          className="press-sm flex size-5 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <svg
        width={MAP_W}
        height={MAP_H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="application"
        aria-label="Navigasi mini-map interaktif"
        className="cursor-crosshair bg-slate-50/80 transition-colors select-none dark:bg-slate-800/50"
      >
        {/* Render Frame Nodes sebagai area pembatas (seperti Figma frame) */}
        {frames.map((f) => {
          const r = nodeRect(f, sizes);
          const p = toMap(r.x, r.y);
          const c = PALETTE[f.color].solid;
          return (
            <g key={f.id}>
              <rect
                x={p.x}
                y={p.y}
                width={Math.max(4, r.w * scale)}
                height={Math.max(4, r.h * scale)}
                rx={3}
                fill={`${c}1a`}
                stroke={c}
                strokeWidth={1}
                strokeDasharray="3 2"
              />
            </g>
          );
        })}

        {/* Render Regular Nodes */}
        {regularNodes.map((n) => {
          const r = nodeRect(n, sizes);
          const p = toMap(r.x, r.y);
          return (
            <rect
              key={n.id}
              x={p.x}
              y={p.y}
              width={Math.max(3, r.w * scale)}
              height={Math.max(3, r.h * scale)}
              rx={2}
              fill={PALETTE[n.color].solid}
              opacity={0.9}
            />
          );
        })}

        {/* Viewport Box (Figma-style active camera viewport) */}
        <rect
          x={viewportBox.x}
          y={viewportBox.y}
          width={viewportBox.w}
          height={viewportBox.h}
          rx={2}
          fill="rgba(59, 130, 246, 0.12)"
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
