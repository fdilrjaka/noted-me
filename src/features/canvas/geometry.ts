import type { CanvasNode, FrameCanvasNode, Side, Viewport } from "@/lib/noteme/canvasStore";

export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

export const FRAME_HEADER_H = 44;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2;
const DEFAULT_AUTO_H = 200;
const DEFAULT_FRAME_H = 400;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Kotak node di koordinat dunia (tinggi node otomatis diambil dari hasil ukur DOM). */
export function nodeRect(n: CanvasNode, sizes: Record<string, Size>): Rect {
  if (n.kind === "frame") {
    return { x: n.x, y: n.y, w: n.w, h: n.collapsed ? FRAME_HEADER_H : (n.h ?? DEFAULT_FRAME_H) };
  }
  return { x: n.x, y: n.y, w: n.w, h: n.h ?? sizes[n.id]?.h ?? DEFAULT_AUTO_H };
}

export function frameFullRect(f: FrameCanvasNode): Rect {
  return { x: f.x, y: f.y, w: f.w, h: f.h ?? DEFAULT_FRAME_H };
}

const centerOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const inside = (r: Rect, p: Point) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Node (non-frame) yang titik tengahnya berada di dalam frame. */
export function containedIds(
  frame: FrameCanvasNode,
  nodes: CanvasNode[],
  sizes: Record<string, Size>,
): string[] {
  const area = frameFullRect(frame);
  return nodes
    .filter((n) => n.kind !== "frame" && inside(area, centerOf(nodeRect(n, sizes))))
    .map((n) => n.id);
}

/** Node yang disembunyikan karena berada di dalam frame yang sedang dilipat. */
export function hiddenByCollapse(nodes: CanvasNode[], sizes: Record<string, Size>): Set<string> {
  const hidden = new Set<string>();
  for (const n of nodes) {
    if (n.kind === "frame" && n.collapsed) {
      for (const id of containedIds(n, nodes, sizes)) hidden.add(id);
    }
  }
  return hidden;
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const DIR: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function anchorPoint(r: Rect, side: Side): Point {
  switch (side) {
    case "top":
      return { x: r.x + r.w / 2, y: r.y };
    case "bottom":
      return { x: r.x + r.w / 2, y: r.y + r.h };
    case "left":
      return { x: r.x, y: r.y + r.h / 2 };
    case "right":
      return { x: r.x + r.w, y: r.y + r.h / 2 };
  }
}

function curve(p0: Point, s0: Side, p1: Point, s1: Side | null) {
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const k = clamp(dist * 0.4, 40, 220);
  const c0 = { x: p0.x + DIR[s0].x * k, y: p0.y + DIR[s0].y * k };
  const c1 = s1 ? { x: p1.x + DIR[s1].x * k, y: p1.y + DIR[s1].y * k } : p1;
  const d = `M ${p0.x} ${p0.y} C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`;
  const mid = {
    x: (p0.x + 3 * c0.x + 3 * c1.x + p1.x) / 8,
    y: (p0.y + 3 * c0.y + 3 * c1.y + p1.y) / 8,
  };
  return { d, mid };
}

export function edgePath(a: Rect, aSide: Side, b: Rect, bSide: Side) {
  return curve(anchorPoint(a, aSide), aSide, anchorPoint(b, bSide), bSide);
}

/** Garis sementara saat menarik koneksi dari sebuah handle ke posisi pointer. */
export function draftPath(a: Rect, aSide: Side, to: Point) {
  return curve(anchorPoint(a, aSide), aSide, to, null).d;
}

/** Sisi node yang paling dekat ke sebuah titik (dipakai saat melepas garis ke node tujuan). */
export function nearestSide(r: Rect, p: Point): Side {
  const c = centerOf(r);
  const dx = (p.x - c.x) / (r.w / 2 || 1);
  const dy = (p.y - c.y) / (r.h / 2 || 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

/** Titik terdekat di sekeliling (perimeter) kotak node terhadap sebuah titik p. */
export function nearestPerimeterPoint(r: Rect, p: Point): { point: Point; side: Side } {
  const clampedX = clamp(p.x, r.x, r.x + r.w);
  const clampedY = clamp(p.y, r.y, r.y + r.h);

  const dLeft = Math.abs(p.x - r.x);
  const dRight = Math.abs(p.x - (r.x + r.w));
  const dTop = Math.abs(p.y - r.y);
  const dBottom = Math.abs(p.y - (r.y + r.h));

  const minD = Math.min(dLeft, dRight, dTop, dBottom);

  if (minD === dLeft) {
    return { point: { x: r.x, y: clampedY }, side: "left" };
  } else if (minD === dRight) {
    return { point: { x: r.x + r.w, y: clampedY }, side: "right" };
  } else if (minD === dTop) {
    return { point: { x: clampedX, y: r.y }, side: "top" };
  } else {
    return { point: { x: clampedX, y: r.y + r.h }, side: "bottom" };
  }
}

/** Cari node target yang dekat atau berada di bawah pointer saat menarik garis koneksi. */
export function findConnectTarget(
  rects: Map<string, Rect>,
  hidden: Set<string>,
  fromId: string,
  p: Point,
  snapDistance = 70,
): { id: string; point: Point; side: Side } | null {
  let closest: { id: string; point: Point; side: Side; dist: number } | null = null;

  rects.forEach((r, id) => {
    if (id === fromId || hidden.has(id)) return;
    const isInside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    const { point, side } = nearestPerimeterPoint(r, p);
    const dist = Math.hypot(p.x - point.x, p.y - point.y);

    if (isInside || dist <= snapDistance) {
      if (!closest || dist < closest.dist) {
        closest = { id, point, side, dist: isInside ? 0 : dist };
      }
    }
  });

  return closest ? { id: closest.id, point: closest.point, side: closest.side } : null;
}

export function boundsOf(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function fitViewport(rect: Rect, view: Size, padding = 64, maxZoom = 1.25): Viewport {
  const zoom = clamp(
    Math.min((view.w - padding * 2) / rect.w, (view.h - padding * 2) / rect.h),
    MIN_ZOOM,
    maxZoom,
  );
  return {
    zoom,
    x: view.w / 2 - (rect.x + rect.w / 2) * zoom,
    y: view.h / 2 - (rect.y + rect.h / 2) * zoom,
  };
}

export function centerOn(p: Point, view: Size, zoom: number): Viewport {
  return { zoom, x: view.w / 2 - p.x * zoom, y: view.h / 2 - p.y * zoom };
}

const GAP = 28;
const PAD = 24;

function flow(
  items: { id: string; rect: Rect }[],
  originX: number,
  originY: number,
  maxWidth: number,
): { positions: Map<string, Point>; bottom: number } {
  const positions = new Map<string, Point>();
  let cx = originX;
  let cy = originY;
  let rowH = 0;
  for (const { id, rect } of items) {
    if (cx > originX && cx + rect.w > originX + maxWidth) {
      cx = originX;
      cy += rowH + GAP;
      rowH = 0;
    }
    positions.set(id, { x: cx, y: cy });
    cx += rect.w + GAP;
    rowH = Math.max(rowH, rect.h);
  }
  return { positions, bottom: cy + rowH };
}

const byPosition = (a: { rect: Rect }, b: { rect: Rect }) =>
  a.rect.y - b.rect.y || a.rect.x - b.rect.x;

export function autoArrange(nodes: CanvasNode[], sizes: Record<string, Size>): CanvasNode[] {
  const positions = new Map<string, Point>();
  const frameHeights = new Map<string, number>();
  const claimed = new Set<string>();
  const frames = nodes.filter((n): n is FrameCanvasNode => n.kind === "frame");

  for (const frame of [...frames].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const kids = containedIds(frame, nodes, sizes)
      .filter((id) => !claimed.has(id))
      .map((id) => nodes.find((n) => n.id === id)!)
      .filter((n) => !n.pinned)
      .map((n) => ({ id: n.id, rect: nodeRect(n, sizes) }))
      .sort(byPosition);
    for (const k of kids) claimed.add(k.id);
    if (kids.length === 0) continue;
    const { positions: pos, bottom } = flow(
      kids,
      frame.x + PAD,
      frame.y + FRAME_HEADER_H + PAD,
      frame.w - PAD * 2,
    );
    pos.forEach((p, id) => positions.set(id, p));
    frameHeights.set(frame.id, Math.max(240, bottom + PAD - frame.y));
  }

  const free = nodes
    .filter((n) => n.kind !== "frame" && !claimed.has(n.id) && !n.pinned)
    .filter((n) => !containedIdsAny(frames, n, nodes, sizes))
    .map((n) => ({ id: n.id, rect: nodeRect(n, sizes) }))
    .sort(byPosition);
  if (free.length) {
    const all = boundsOf(nodes.map((n) => nodeRect(n, sizes)));
    const frameRects = frames.map((f) => frameFullRect(f));
    const bottom = frameRects.length
      ? Math.max(...frameRects.map((r) => r.y + r.h)) + 80
      : (all?.y ?? 0);
    const left = all?.x ?? 0;
    const { positions: pos } = flow(free, left, bottom, 1300);
    pos.forEach((p, id) => positions.set(id, p));
  }

  return nodes.map((n) => {
    const p = positions.get(n.id);
    const h = frameHeights.get(n.id);
    if (!p && h === undefined) return n;
    return {
      ...n,
      ...(p ? { x: p.x, y: p.y } : {}),
      ...(h !== undefined ? { h } : {}),
    } as CanvasNode;
  });
}

function containedIdsAny(
  frames: FrameCanvasNode[],
  node: CanvasNode,
  nodes: CanvasNode[],
  sizes: Record<string, Size>,
) {
  return frames.some((f) => containedIds(f, nodes, sizes).includes(node.id));
}
