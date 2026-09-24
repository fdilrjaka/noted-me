import { ChevronDown, ChevronUp } from "lucide-react";
import { checkpoint, patchNode, type FrameCanvasNode } from "@/lib/noteme/canvasStore";
import { FRAME_HEADER_H } from "../geometry";
import { PALETTE } from "../palette";
import { EditableTitle, PinRemove } from "./NodeShell";

/**
 * Frame = area pengelompok. Hanya bilah judulnya yang menangkap pointer (untuk geser/pilih);
 * badan frame "tembus" ke kanvas supaya node di dalamnya tetap bisa diklik & digeser.
 */
export function FrameNodeView({ node, selected }: { node: FrameCanvasNode; selected: boolean }) {
  const c = PALETTE[node.color];
  const height = node.collapsed ? FRAME_HEADER_H : (node.h ?? 400);
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: node.x, top: node.y, width: node.w, height }}
    >
      <div
        className={`absolute inset-0 rounded-3xl border-2 ${selected ? "ring-2 ring-primary" : ""}`}
        style={{ borderColor: c.solid, backgroundColor: `${c.solid}14` }}
      />
      <div
        data-node-id={node.id}
        className="pointer-events-auto relative flex items-center gap-1.5 px-5"
        style={{ height: FRAME_HEADER_H, color: c.solid, cursor: node.pinned ? "default" : "grab" }}
      >
        <EditableTitle
          value={node.title}
          onCommit={(title) => {
            checkpoint();
            patchNode(node.id, { title });
          }}
          className="text-lg"
        />
        <PinRemove node={node} light={false} />
        <button
          type="button"
          aria-label={node.collapsed ? "Buka frame" : "Lipat frame"}
          title={node.collapsed ? "Buka frame" : "Lipat frame"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            checkpoint();
            patchNode(node.id, { collapsed: !node.collapsed });
          }}
          className="press-sm flex size-7 flex-none items-center justify-center rounded-full hover:bg-black/10"
        >
          {node.collapsed ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
        </button>
      </div>
      {!node.collapsed && (
        <span
          data-resize={node.id}
          className="pointer-events-auto absolute bottom-1 right-1 size-5 cursor-nwse-resize rounded-br-2xl"
          style={{ background: `linear-gradient(135deg, transparent 50%, ${c.solid} 50%)` }}
        />
      )}
    </div>
  );
}
