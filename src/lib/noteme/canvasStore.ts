import { useSyncExternalStore } from "react";

export type Side = "top" | "right" | "bottom" | "left";
export type ColorKey = "blue" | "orange" | "green" | "purple" | "red" | "yellow" | "pink" | "slate";
export const COLOR_KEYS: ColorKey[] = [
  "blue",
  "orange",
  "green",
  "purple",
  "red",
  "yellow",
  "pink",
  "slate",
];

type Base = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number | null;
  title: string;
  color: ColorKey;
  pinned: boolean;
};

export type TodoCanvasNode = Base & { kind: "todo"; categoryId: string };
export type ScheduleCanvasNode = Base & { kind: "schedule" };
export type TrackerCanvasNode = Base & { kind: "tracker"; categoryId: string };
export type NoteCanvasNode = Base & { kind: "note"; subjectId: string | null };
export type StickyCanvasNode = Base & { kind: "sticky"; text: string };
export type TableCanvasNode = Base & { kind: "table"; cells: string[][] };
export type FrameCanvasNode = Base & { kind: "frame"; collapsed: boolean };

export type CanvasNode =
  | TodoCanvasNode
  | ScheduleCanvasNode
  | TrackerCanvasNode
  | NoteCanvasNode
  | StickyCanvasNode
  | TableCanvasNode
  | FrameCanvasNode;

export type NodeKind = CanvasNode["kind"];

export type CanvasEdge = {
  id: string;
  from: string;
  fromSide: Side;
  fromRatio?: number;
  to: string;
  toSide: Side;
  toRatio?: number;
};

export type CanvasDoc = { nodes: CanvasNode[]; edges: CanvasEdge[] };
export type Viewport = { x: number; y: number; zoom: number };
type State = { doc: CanvasDoc; viewport: Viewport };

const KEY = "noteme.canvas.v1";
const HISTORY_LIMIT = 60;
const EMPTY_STATE: State = { doc: { nodes: [], edges: [] }, viewport: { x: 0, y: 0, zoom: 1 } };

export function canvasUid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedState(): State {
  const frameId = canvasUid();
  const schedule: CanvasNode = {
    id: canvasUid(),
    kind: "schedule",
    x: 40,
    y: 96,
    w: 300,
    h: null,
    title: "Jadwal Minggu Ini",
    color: "blue",
    pinned: false,
  };
  const todo: CanvasNode = {
    id: canvasUid(),
    kind: "todo",
    categoryId: "tugas-kuliah",
    x: 400,
    y: 96,
    w: 300,
    h: null,
    title: "To-Do List",
    color: "orange",
    pinned: false,
  };
  const tracker: CanvasNode = {
    id: canvasUid(),
    kind: "tracker",
    categoryId: "tugas-kuliah",
    x: 760,
    y: 96,
    w: 300,
    h: null,
    title: "Tracker Tugas",
    color: "green",
    pinned: false,
  };
  const sticky: CanvasNode = {
    id: canvasUid(),
    kind: "sticky",
    text: "",
    x: 40,
    y: 430,
    w: 220,
    h: 150,
    title: "Catatan cepat",
    color: "yellow",
    pinned: false,
  };
  const frame: CanvasNode = {
    id: frameId,
    kind: "frame",
    collapsed: false,
    x: 0,
    y: 0,
    w: 1100,
    h: 640,
    title: "Minggu Ini",
    color: "blue",
    pinned: false,
  };
  return {
    doc: {
      nodes: [frame, schedule, todo, tracker, sticky],
      edges: [
        { id: canvasUid(), from: schedule.id, fromSide: "right", to: todo.id, toSide: "left" },
        { id: canvasUid(), from: todo.id, fromSide: "right", to: tracker.id, toSide: "left" },
      ],
    },
    viewport: { x: 90, y: 50, zoom: 0.85 },
  };
}

let state: State = EMPTY_STATE;
let loaded = false;
let past: CanvasDoc[] = [];
let future: CanvasDoc[] = [];
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function writeNow() {
  persistTimer = null;
  if (typeof window === "undefined" || !loaded) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, ...state }));
  } catch {
    // ignore local storage full
  }
}

function schedulePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(writeNow, 250);
}

if (typeof window !== "undefined") {
  const flush = () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      writeNow();
    }
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function sanitize(raw: unknown): State | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<State>;
  if (!r.doc || !Array.isArray(r.doc.nodes) || !Array.isArray(r.doc.edges)) return null;
  const vp = r.viewport;
  return {
    doc: { nodes: r.doc.nodes, edges: r.doc.edges },
    viewport: {
      x: typeof vp?.x === "number" ? vp.x : 0,
      y: typeof vp?.y === "number" ? vp.y : 0,
      zoom: typeof vp?.zoom === "number" ? Math.min(2, Math.max(0.2, vp.zoom)) : 1,
    },
  };
}

export function loadCanvas() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  let next: State | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) next = sanitize(JSON.parse(raw));
  } catch {
    next = null;
  }
  state = next ?? seedState();
  past = [];
  future = [];
  notify();
}

export function clearCanvasLocal() {
  loaded = true;
  past = [];
  future = [];
  state = seedState();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useCanvasDoc(): CanvasDoc {
  return useSyncExternalStore(
    subscribe,
    () => state.doc,
    () => EMPTY_STATE.doc,
  );
}

export function useCanvasViewport(): Viewport {
  return useSyncExternalStore(
    subscribe,
    () => state.viewport,
    () => EMPTY_STATE.viewport,
  );
}

export function useCanvasHistory(): { canUndo: boolean; canRedo: boolean } {
  const key = useSyncExternalStore(
    subscribe,
    () => `${past.length > 0 ? 1 : 0}:${future.length > 0 ? 1 : 0}`,
    () => "0:0",
  );
  return { canUndo: key.startsWith("1"), canRedo: key.endsWith(":1") };
}

export function getCanvasDoc() {
  return state.doc;
}

export function checkpoint() {
  if (past[past.length - 1] === state.doc) return;
  past.push(state.doc);
  if (past.length > HISTORY_LIMIT) past.shift();
  future = [];
  notify();
}

export function undo() {
  const prev = past.pop();
  if (!prev) return;
  future.push(state.doc);
  state = { ...state, doc: prev };
  schedulePersist();
  notify();
}

export function redo() {
  const next = future.pop();
  if (!next) return;
  past.push(state.doc);
  state = { ...state, doc: next };
  schedulePersist();
  notify();
}

function mutate(fn: (doc: CanvasDoc) => CanvasDoc) {
  const next = fn(state.doc);
  if (next === state.doc) return;
  state = { ...state, doc: next };
  schedulePersist();
  notify();
}

export function setViewport(viewport: Viewport) {
  state = { ...state, viewport };
  schedulePersist();
  notify();
}

export function addNode(node: CanvasNode) {
  checkpoint();
  mutate((d) => ({ ...d, nodes: [...d.nodes, node] }));
}

export function patchNode(id: string, patch: Record<string, unknown>) {
  mutate((d) => ({
    ...d,
    nodes: d.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as CanvasNode) : n)),
  }));
}

export function setNodePositions(positions: Map<string, { x: number; y: number }>) {
  mutate((d) => ({
    ...d,
    nodes: d.nodes.map((n) => {
      const p = positions.get(n.id);
      return p ? ({ ...n, x: p.x, y: p.y } as CanvasNode) : n;
    }),
  }));
}

export function replaceNodes(nodes: CanvasNode[]) {
  checkpoint();
  mutate((d) => ({ ...d, nodes }));
}

export function removeNodes(ids: string[]) {
  if (ids.length === 0) return;
  const set = new Set(ids);
  checkpoint();
  mutate((d) => ({
    nodes: d.nodes.filter((n) => !set.has(n.id)),
    edges: d.edges.filter((e) => !set.has(e.from) && !set.has(e.to)),
  }));
}

export function bringToFront(id: string) {
  mutate((d) => {
    const idx = d.nodes.findIndex((n) => n.id === id);
    if (idx === -1 || idx === d.nodes.length - 1) return d;
    const node = d.nodes[idx]!;
    if (node.kind === "frame") return d;
    return { ...d, nodes: [...d.nodes.slice(0, idx), ...d.nodes.slice(idx + 1), node] };
  });
}

export function addEdge(edge: Omit<CanvasEdge, "id">) {
  if (edge.from === edge.to) return;
  // Cegah duplikasi persis sama
  const exact = state.doc.edges.some(
    (e) =>
      e.from === edge.from &&
      e.to === edge.to &&
      e.fromSide === edge.fromSide &&
      e.toSide === edge.toSide,
  );
  if (exact) return;
  checkpoint();
  mutate((d) => {
    // Jika sudah ada sambungan searah sebelumnya, perbarui posisinya agar rapi
    const idx = d.edges.findIndex((e) => e.from === edge.from && e.to === edge.to);
    if (idx !== -1) {
      const updated = [...d.edges];
      updated[idx] = { ...edge, id: updated[idx]!.id };
      return { ...d, edges: updated };
    }
    return { ...d, edges: [...d.edges, { ...edge, id: canvasUid() }] };
  });
}

export function removeEdge(id: string) {
  checkpoint();
  mutate((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }));
}
