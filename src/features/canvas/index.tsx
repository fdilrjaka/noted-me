import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { useTodoOwner } from "@/features/todo/hooks/useTodoOwner";
import { OwnerAvatar } from "@/features/todo/components/OwnerAvatar";
import {
  bringToFront,
  loadCanvas,
  redo,
  replaceNodes,
  undo,
  useCanvasDoc,
  useCanvasHistory,
  useCanvasViewport,
  setViewport,
  type Viewport,
} from "@/lib/noteme/canvasStore";
import { CanvasSurface, type CanvasSurfaceHandle } from "./components/CanvasSurface";
import { CanvasToolbar, type PointerTool } from "./components/CanvasToolbar";
import { JumpBar } from "./components/JumpBar";
import { MiniMap } from "./components/MiniMap";
import { NewNodeMenu } from "./components/NewNodeMenu";
import { autoArrange, fitViewport, nodeRect, type Size } from "./geometry";

export function DashboardPage() {
  const doc = useCanvasDoc();
  const viewport = useCanvasViewport();
  const { canUndo, canRedo } = useCanvasHistory();
  const owner = useTodoOwner();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<PointerTool>("select");
  const [showMap, setShowMap] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const handleRef = useRef<CanvasSurfaceHandle | null>(null);

  useEffect(() => loadCanvas(), []);

  // Ambil ukuran DOM terkini tiap node (dipakai minimap & rapikan otomatis) tanpa membaca ulang
  // dari CanvasSurface — cukup ukur langsung dari data-node-id yang sudah dirender di DOM.
  useEffect(() => {
    const measure = () => {
      const next: Record<string, Size> = {};
      document.querySelectorAll<HTMLElement>("[data-node-id]").forEach((el) => {
        const id = el.getAttribute("data-node-id");
        if (id) next[id] = { w: el.offsetWidth, h: el.offsetHeight };
      });
      setSizes(next);
    };
    measure();
    const t = setInterval(measure, 600);
    return () => clearInterval(t);
  }, [doc.nodes.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jump = useCallback((vp: Viewport, nodeId?: string) => {
    setViewport(vp);
    if (nodeId) {
      bringToFront(nodeId);
      setSelected(new Set([nodeId]));
      setFlash(nodeId);
      setTimeout(() => setFlash((f) => (f === nodeId ? null : f)), 1400);
    }
  }, []);

  const zoomAt = (z: number) => {
    const size = handleRef.current?.viewSize() ?? { w: window.innerWidth, h: window.innerHeight };
    const cx = size.w / 2;
    const cy = size.h / 2;
    const wx = (cx - viewport.x) / viewport.zoom;
    const wy = (cy - viewport.y) / viewport.zoom;
    setViewport({ zoom: z, x: cx - wx * z, y: cy - wy * z });
  };

  const fitToScreen = () => {
    const size = handleRef.current?.viewSize() ?? { w: window.innerWidth, h: window.innerHeight };
    const rects = doc.nodes.map((n) => nodeRect(n, sizes));
    const rect = rects.reduce<{ x: number; y: number; w: number; h: number } | null>((acc, r) => {
      if (!acc) return r;
      const x2 = Math.max(acc.x + acc.w, r.x + r.w);
      const y2 = Math.max(acc.y + acc.h, r.y + r.h);
      const x = Math.min(acc.x, r.x);
      const y = Math.min(acc.y, r.y);
      return { x, y, w: x2 - x, h: y2 - y };
    }, null);
    if (rect) setViewport(fitViewport(rect, size));
  };

  return (
    <main className="fixed inset-0 overflow-hidden text-foreground">
      <Sidebar offsetTop />

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 md:gap-4 md:pl-[6.5rem] md:pr-5">
        <div className="hidden flex-none items-baseline gap-1.5 text-sm text-muted-foreground sm:flex">
          <span>Dashboard</span>
          <span>/</span>
          <span className="font-semibold text-foreground">My Workspace</span>
        </div>
        <JumpBar
          nodes={doc.nodes}
          sizes={sizes}
          viewSize={handleRef.current?.viewSize() ?? { w: 1200, h: 800 }}
          onJump={jump}
        />
        <div className="ml-auto flex flex-none items-center gap-3">
          <SyncStatus />
          <OwnerAvatar owner={owner} className="size-9" />
        </div>
      </header>

      {/* Canvas */}
      <div className="absolute inset-0 pt-16 md:pl-[5.5rem]">
        <CanvasSurface
          nodes={doc.nodes}
          edges={doc.edges}
          viewport={viewport}
          selected={selected}
          onSelect={setSelected}
          editable
          tool={tool}
          onReady={(h) => {
            handleRef.current = h;
          }}
        />
      </div>

      {/* Node yang baru dituju lewat pencarian berkedip singkat */}
      {flash && <style>{`[data-node-id="${flash}"]{animation:canvas-flash 1.4s ease-out}`}</style>}
      <style>{`@keyframes canvas-flash{0%,100%{filter:none}30%{filter:drop-shadow(0 0 0 6px rgba(59,130,246,.35))}}`}</style>

      {/* Toolbar kanan atas: New Node / Table / Frame */}
      <div className="pointer-events-none fixed right-4 top-[4.75rem] z-30">
        <div className="pointer-events-auto">
          <NewNodeMenu
            getCenter={() =>
              handleRef.current?.screenToWorld(
                window.innerWidth * 0.65,
                window.innerHeight * 0.5,
              ) ?? { x: 0, y: 0 }
            }
          />
        </div>
      </div>

      {/* Floating toolbar kiri bawah */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex justify-center px-3 md:bottom-6 md:justify-start md:pl-[6.5rem]">
        <CanvasToolbar
          tool={tool}
          onTool={setTool}
          zoom={viewport.zoom}
          onZoom={zoomAt}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onArrange={() => replaceNodes(autoArrange(doc.nodes, sizes))}
          onFit={fitToScreen}
        />
      </div>

      {/* Mini-map kanan bawah */}
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-30 md:bottom-6">
        {showMap ? (
          <MiniMap
            nodes={doc.nodes}
            sizes={sizes}
            viewport={viewport}
            viewSize={handleRef.current?.viewSize() ?? { w: 1200, h: 800 }}
            onJump={setViewport}
            onClose={() => setShowMap(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            aria-label="Tampilkan mini-map"
            title="Tampilkan mini-map"
            className="press-sm pointer-events-auto flex size-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
          >
            <MapIcon className="size-5" />
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
