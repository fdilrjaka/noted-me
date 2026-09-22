import {
  Hand,
  LayoutGrid,
  Maximize,
  MousePointer2,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM } from "../geometry";

export type PointerTool = "select" | "pan";

const btn =
  "press-sm flex size-9 items-center justify-center rounded-xl text-foreground/75 transition-colors hover:bg-black/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10 sm:size-10";
const btnActive = "bg-black/[0.07] text-foreground dark:bg-white/15";

/** Floating toolbar kiri bawah: alat pointer, undo/redo, zoom, dan Rapikan Otomatis. */
export function CanvasToolbar({
  tool,
  onTool,
  zoom,
  onZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onArrange,
  onFit,
}: {
  tool: PointerTool;
  onTool: (t: PointerTool) => void;
  zoom: number;
  onZoom: (z: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onArrange: () => void;
  onFit: () => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <button
        type="button"
        aria-label="Alat pilih"
        title="Pilih & seret node (V)"
        aria-pressed={tool === "select"}
        onClick={() => onTool("select")}
        className={`${btn} ${tool === "select" ? btnActive : ""}`}
      >
        <MousePointer2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Alat geser"
        title="Geser kanvas (Tahan Space / klik tengah juga bisa)"
        aria-pressed={tool === "pan"}
        onClick={() => onTool("pan")}
        className={`${btn} ${tool === "pan" ? btnActive : ""}`}
      >
        <Hand className="size-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

      <button
        type="button"
        aria-label="Urungkan"
        title="Urungkan (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className={btn}
      >
        <Undo2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Ulangi"
        title="Ulangi (Ctrl+Shift+Z)"
        disabled={!canRedo}
        onClick={onRedo}
        className={btn}
      >
        <Redo2 className="size-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

      <button
        type="button"
        aria-label="Perkecil"
        title="Perkecil"
        onClick={() => onZoom(Math.max(MIN_ZOOM, zoom / 1.2))}
        className={btn}
      >
        <ZoomOut className="size-5" />
      </button>
      <span className="w-12 flex-none text-center text-xs font-medium tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        aria-label="Perbesar"
        title="Perbesar"
        onClick={() => onZoom(Math.min(MAX_ZOOM, zoom * 1.2))}
        className={btn}
      >
        <ZoomIn className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Sesuaikan ke layar"
        title="Sesuaikan ke layar"
        onClick={onFit}
        className={btn}
      >
        <Maximize className="size-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

      <button
        type="button"
        onClick={onArrange}
        title="Susun ulang node yang tidak dikunci"
        className="press-sm flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 sm:h-10"
      >
        <LayoutGrid className="size-4" /> Rapikan Otomatis
      </button>
    </div>
  );
}
