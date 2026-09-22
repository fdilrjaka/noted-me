import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pin, PinOff, X } from "lucide-react";
import {
  checkpoint,
  patchNode,
  removeNodes,
  type CanvasNode,
  type Side,
} from "@/lib/noteme/canvasStore";
import type { Size } from "../geometry";
import { PALETTE } from "../palette";

export type OnSize = (id: string, size: Size) => void;

/** Lapor ukuran DOM node ke kanvas (dipakai untuk garis koneksi, minimap, dan rapikan otomatis). */
export function useReportSize(id: string, onSize: OnSize) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => onSize(id, { w: el.offsetWidth, h: el.offsetHeight });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, onSize]);
  return ref;
}

/** Judul yang bisa diedit dengan klik ganda. */
export function EditableTitle({
  value,
  onCommit,
  className = "",
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    const done = () => {
      setEditing(false);
      if (draft.trim() && draft.trim() !== value) onCommit(draft.trim());
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => {
          if (e.key === "Enter") done();
          if (e.key === "Escape") setEditing(false);
        }}
        maxLength={60}
        className={`min-w-0 flex-1 rounded-md bg-white/25 px-1.5 py-0.5 font-semibold outline-none ${className}`}
      />
    );
  }
  return (
    <span
      title="Klik ganda untuk ganti nama"
      onDoubleClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`min-w-0 flex-1 truncate font-semibold ${className}`}
    >
      {value}
    </span>
  );
}

const HANDLE_POS: Record<Side, string> = {
  top: "left-1/2 -top-2 -translate-x-1/2",
  bottom: "left-1/2 -bottom-2 -translate-x-1/2",
  left: "top-1/2 -left-2 -translate-y-1/2",
  right: "top-1/2 -right-2 -translate-y-1/2",
};

export function ConnectHandles({ id, visible }: { id: string; visible: boolean }) {
  return (
    <>
      {(["top", "right", "bottom", "left"] as Side[]).map((side) => (
        <span
          key={side}
          data-handle-node={id}
          data-handle-side={side}
          title="Tarik untuk menghubungkan ke node lain"
          className={`absolute z-10 size-4 cursor-crosshair rounded-full border-2 border-white bg-primary shadow transition-opacity ${HANDLE_POS[side]} ${
            visible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      ))}
    </>
  );
}

export function PinRemove({ node, light = true }: { node: CanvasNode; light?: boolean }) {
  const tone = light ? "hover:bg-white/25" : "hover:bg-black/10";
  return (
    <>
      <button
        type="button"
        aria-label={node.pinned ? "Lepas kunci posisi" : "Kunci posisi"}
        title={node.pinned ? "Lepas kunci posisi" : "Kunci posisi"}
        onClick={() => {
          checkpoint();
          patchNode(node.id, { pinned: !node.pinned });
        }}
        className={`press-sm flex size-6 flex-none items-center justify-center rounded-full ${tone}`}
      >
        {node.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      </button>
      <button
        type="button"
        aria-label="Hapus dari dashboard"
        title="Hapus dari dashboard (data aslinya tidak ikut terhapus)"
        onClick={() => removeNodes([node.id])}
        className={`press-sm flex size-6 flex-none items-center justify-center rounded-full ${tone}`}
      >
        <X className="size-3.5" />
      </button>
    </>
  );
}

export function LivePill() {
  return (
    <span className="flex flex-none items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">
      <span className="size-1.5 rounded-full bg-green-300" /> Live
    </span>
  );
}

export function NodeShell({
  node,
  selected,
  onSize,
  pill,
  children,
}: {
  node: CanvasNode;
  selected: boolean;
  onSize: OnSize;
  /** "live" = data tersambung ke halaman asli, "manual" = data milik dashboard. */
  pill: "live" | "manual";
  children: ReactNode;
}) {
  const ref = useReportSize(node.id, onSize);
  const color = PALETTE[node.color];
  return (
    <div
      ref={ref}
      data-node-id={node.id}
      className="group absolute"
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        ...(node.h !== null ? { height: node.h } : {}),
      }}
    >
      <div
        className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)] ring-2 dark:bg-slate-900 ${
          selected ? "ring-primary" : "ring-transparent"
        }`}
      >
        <div
          className="flex items-center gap-1.5 px-3.5 py-2 text-white"
          style={{ backgroundColor: color.solid, cursor: node.pinned ? "default" : "grab" }}
        >
          <EditableTitle
            value={node.title}
            onCommit={(title) => {
              checkpoint();
              patchNode(node.id, { title });
            }}
            className="text-[15px]"
          />
          {pill === "live" ? (
            <LivePill />
          ) : (
            <span className="flex-none rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">
              Manual
            </span>
          )}
          <PinRemove node={node} />
        </div>
        <div className="min-h-0 flex-1 p-3">{children}</div>
      </div>
      <ConnectHandles id={node.id} visible={selected} />
    </div>
  );
}
