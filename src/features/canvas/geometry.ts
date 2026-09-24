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

export function anchorPoint(r: Rect, side: Side, ratio = 0.5): Point {
  const t = clamp(ratio, 0.05, 0.95);
  switch (side) {
    case "top":
      return { x: r.x + r.w * t, y: r.y };
    case "bottom":
      return { x: r.x + r.w * t, y: r.y + r.h };
    case "left":
      return { x: r.x, y: r.y + r.h * t };
    case "right":
      return { x: r.x + r.w, y: r.y + r.h * t };
  }
}

/** Titik perimeter terdekat pada persegi panjang dari posisi sembarang p */
export function nearestPerimeterPoint(
  r: Rect,
  p: Point,
): { side: Side; ratio: number; point: Point } {
  const topX = clamp(p.x, r.x, r.x + r.w);
  const topPt = { x: topX, y: r.y };
  const topDist = Math.hypot(p.x - topPt.x, p.y - topPt.y);

  const btmX = clamp(p.x, r.x, r.x + r.w);
  const btmPt = { x: btmX, y: r.y + r.h };
  const btmDist = Math.hypot(p.x - btmPt.x, p.y - btmPt.y);

  const leftY = clamp(p.y, r.y, r.y + r.h);
  const leftPt = { x: r.x, y: leftY };
  const leftDist = Math.hypot(p.x - leftPt.x, p.y - leftPt.y);

  const rightY = clamp(p.y, r.y, r.y + r.h);
  const rightPt = { x: r.x + r.w, y: rightY };
  const rightDist = Math.hypot(p.x - rightPt.x, p.y - rightPt.y);

  let side: Side = "top";
  let minDist = topDist;
  let pt = topPt;

  if (btmDist < minDist) {
    minDist = btmDist;
    side = "bottom";
    pt = btmPt;
  }
  if (leftDist < minDist) {
    minDist = leftDist;
    side = "left";
    pt = leftPt;
  }
  if (rightDist < minDist) {
    minDist = rightDist;
    side = "right";
    pt = rightPt;
  }

  let ratio =
    side === "top" || side === "bottom"
      ? r.w > 0 ? (pt.x - r.x) / r.w : 0.5
      : r.h > 0 ? (pt.y - r.y) / r.h : 0.5;

  // Magnet halus jika mendekati titik tengah sisi (0.42 - 0.58)
  if (Math.abs(ratio - 0.5) < 0.08) {
    ratio = 0.5;
    if (side === "top" || side === "bottom") pt.x = r.x + r.w * 0.5;
    else pt.y = r.y + r.h * 0.5;
  }

  ratio = clamp(ratio, 0.05, 0.95);

  return { side, ratio, point: pt };
}

export type SnapTarget = {
  nodeId: string;
  side: Side;
  ratio: number;
  point: Point;
  distance: number;
};

/** Mencari target snap terdekat secara konsisten di sekeliling node/tabel */
export function findSnapTarget(
  to: Point,
  fromId: string,
  nodes: CanvasNode[],
  rects: Map<string, Rect>,
  hidden: Set<string>,
  maxSnapDist = 80,
): SnapTarget | null {
  let best: SnapTarget | null = null;
  let minScore = Infinity;

  for (const node of nodes) {
    if (node.id === fromId || hidden.has(node.id) || node.kind === "frame") continue;
    const r = rects.get(node.id);
    if (!r) continue;

    const peri = nearestPerimeterPoint(r, to);
    const dist = Math.hypot(to.x - peri.point.x, to.y - peri.point.y);

    const isInside =
      to.x >= r.x && to.x <= r.x + r.w && to.y >= r.y && to.y <= r.y + r.h;

    // Jika kursor berada di dalam kotak node, jadikan jarak 0 agar selalu tertangkap
    const score = isInside ? 0 : dist;

    if (score <= maxSnapDist && score < minScore) {
      minScore = score;
      best = {
        nodeId: node.id,
        side: peri.side,
        ratio: peri.ratio,
        point: peri.point,
        distance: score,
      };
    }
  }

  return best;
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

export function edgePath(
  a: Rect,
  aSide: Side,
  b: Rect,
  bSide: Side,
  aRatio = 0.5,
  bRatio = 0.5,
) {
  return curve(anchorPoint(a, aSide, aRatio), aSide, anchorPoint(b, bSide, bRatio), bSide);
}

export function draftPath(
  a: Rect,
  aSide: Side,
  to: Point,
  targetSide: Side | null = null,
  fromRatio = 0.5,
) {
  return curve(anchorPoint(a, aSide, fromRatio), aSide, to, targetSide).d;
}

export function nearestSide(r: Rect, p: Point): Side {
  const c = centerOf(r);
  const dx = (p.x - c.x) / (r.w / 2 || 1);
  const dy = (p.y - c.y) / (r.h / 2 || 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
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
