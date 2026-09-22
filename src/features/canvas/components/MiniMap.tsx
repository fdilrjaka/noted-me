import { useMemo } from "react";
import type { CanvasNode, Viewport } from "@/lib/noteme/canvasStore";
import { X } from "lucide-react";
import { boundsOf, clamp, nodeRect, type Size } from "../geometry";
import { PALETTE } from "../palette";

const MAP_W = 200;
const MAP_H = 130;
const PAD = 120;

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
  const bounds = useMemo(() => {
    const b = boundsOf(nodes.map((n) => nodeRect(n, sizes)));
    if (!b) return { x: 0, y: 0, w: 800, h: 600 };
    return { x: b.x - PAD, y: b.y - PAD, w: b.w + PAD * 2, h: b.h + PAD * 2 };
  }, [nodes, sizes]);

  const scale = Math.min(MAP_W / bounds.w, MAP_H / bounds.h);
  const toMap = (wx: number, wy: number) => ({
    x: (wx - bounds.x) * scale,
    y: (wy - bounds.y) * scale,
  });

  const viewportBox = (() => {
    const topLeft = { x: -viewport.x / viewport.zoom, y: -viewport.y / viewport.zoom };
    const p0 = toMap(topLeft.x, topLeft.y);
    return {
      ...p0,
      w: (viewSize.w / viewport.zoom) * scale,
      h: (viewSize.h / viewport.zoom) * scale,
    };
  })();

  const jumpTo = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = bounds.x + mx / scale;
    const wy = bounds.y + my / scale;
    onJump({
      zoom: viewport.zoom,
      x: viewSize.w / 2 - wx * viewport.zoom,
      y: viewSize.h / 2 - wy * viewport.zoom,
    });
  };

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
      <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
        Mini-map
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
        onClick={jumpTo}
        role="button"
        aria-label="Lompat ke posisi di kanvas"
        className="cursor-pointer bg-slate-50 dark:bg-slate-800/60"
      >
        {nodes
          .filter((n) => n.kind !== "frame")
          .map((n) => {
            const r = nodeRect(n, sizes);
            const p = toMap(r.x, r.y);
            return (
              <rect
                key={n.id}
                x={p.x}
                y={p.y}
                width={Math.max(2, r.w * scale)}
                height={Math.max(2, r.h * scale)}
                rx={1.5}
                fill={PALETTE[n.color].solid}
                opacity={0.85}
              />
            );
          })}
        <rect
          x={clamp(viewportBox.x, 0, MAP_W)}
          y={clamp(viewportBox.y, 0, MAP_H)}
          width={Math.min(viewportBox.w, MAP_W)}
          height={Math.min(viewportBox.h, MAP_H)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
