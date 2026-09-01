import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eraser, PenLine, RotateCcw, Trash2, X } from "lucide-react";

type Props = {
  onCancel: () => void;
  onInsert: (dataUrl: string) => void;
};

const COLORS = ["#f5f5f7", "#0a84ff", "#30d158", "#ffd60a", "#ff9f0a", "#ff453a", "#bf5af2"];
const SIZES = [2, 4, 8, 14];

type Stroke = {
  color: string;
  size: number;
  erase: boolean;
  points: { x: number; y: number }[];
};

export function DrawingCanvas({ onCancel, onInsert }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState<string>(COLORS[1] as string);
  const [size, setSize] = useState<number>(4);
  const [erase, setErase] = useState(false);
  const [empty, setEmpty] = useState(true);

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const stroke of strokes.current) {
      ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.erase ? stroke.size * 4 : stroke.size;
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (stroke.points.length === 1) {
        const p = stroke.points[0]!;
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = { color, size, erase, points: [pos(e)] };
    strokes.current.push(current.current);
    setEmpty(false);
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    current.current.points.push(pos(e));
    redraw();
  };

  const onPointerUp = () => {
    current.current = null;
  };

  const undo = () => {
    strokes.current.pop();
    setEmpty(strokes.current.length === 0);
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    setEmpty(true);
    redraw();
  };

  const insert = () => {
    const canvas = canvasRef.current;
    if (!canvas || empty) return onCancel();
    onInsert(canvas.toDataURL("image/png"));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fade-in-ios fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-xl"
      style={{ height: "100dvh" }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="press-sm flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-input active:scale-90"
          aria-label="Tutup"
        >
          <X className="size-5" />
        </button>
        <span className="text-sm font-medium">Tulis Tangan</span>
        <button
          type="button"
          onClick={insert}
          disabled={empty}
          className="press-sm flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40 active:scale-95"
        >
          <Check className="size-4" /> Sisipkan
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="mx-3 min-h-0 flex-1 touch-none rounded-2xl border border-border bg-card"
      />

      <div className="glass-toolbar mx-3 mt-3 mb-[calc(env(safe-area-inset-bottom)+0.85rem)] flex items-center gap-2 overflow-x-auto rounded-2xl px-3 py-2">
        <button
          type="button"
          onClick={() => setErase(false)}
          aria-label="Pena"
          className={`press-sm flex size-9 flex-none items-center justify-center rounded-xl active:scale-90 ${!erase ? "bg-input text-foreground" : "text-muted-foreground"}`}
        >
          <PenLine className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setErase(true)}
          aria-label="Penghapus"
          className={`press-sm flex size-9 flex-none items-center justify-center rounded-xl active:scale-90 ${erase ? "bg-input text-foreground" : "text-muted-foreground"}`}
        >
          <Eraser className="size-4" />
        </button>

        <span className="h-5 w-px flex-none bg-border" aria-hidden="true" />

        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-label={`Ketebalan ${s}`}
            className={`press-sm flex size-9 flex-none items-center justify-center rounded-xl active:scale-90 ${size === s ? "bg-input" : ""}`}
          >
            <span
              className="block rounded-full bg-foreground"
              style={{ width: s + 3, height: s + 3 }}
            />
          </button>
        ))}

        <span className="h-5 w-px flex-none bg-border" aria-hidden="true" />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setErase(false);
            }}
            aria-label={`Warna ${c}`}
            className={`press-sm size-7 flex-none rounded-full active:scale-90 ${color === c && !erase ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            style={{ background: c }}
          />
        ))}

        <span className="h-5 w-px flex-none bg-border" aria-hidden="true" />

        <button
          type="button"
          onClick={undo}
          aria-label="Undo"
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground active:scale-90"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={clear}
          aria-label="Hapus semua"
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground active:scale-90"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
