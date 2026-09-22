import { checkpoint, patchNode, type StickyCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { ConnectHandles, PinRemove, useReportSize, type OnSize } from "./NodeShell";

/** Sticky note manual (isinya milik dashboard, tidak terhubung ke halaman lain). */
export function StickyNodeView({
  node,
  selected,
  onSize,
}: {
  node: StickyCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const ref = useReportSize(node.id, onSize);
  const c = PALETTE[node.color];
  return (
    <div
      ref={ref}
      data-node-id={node.id}
      className="group absolute"
      style={{ left: node.x, top: node.y, width: node.w, height: node.h ?? 150 }}
    >
      <div
        className={`relative flex h-full flex-col rounded-xl p-3 shadow-[0_6px_16px_rgba(15,23,42,0.15)] ring-2 ${
          selected ? "ring-primary" : "ring-transparent"
        }`}
        style={{ backgroundColor: c.soft, color: c.ink, cursor: node.pinned ? "default" : "grab" }}
      >
        <div className="absolute right-1.5 top-1.5 flex opacity-0 transition-opacity group-hover:opacity-100">
          <PinRemove node={node} light={false} />
        </div>
        <textarea
          value={node.text}
          onFocus={checkpoint}
          onChange={(e) => patchNode(node.id, { text: e.target.value })}
          placeholder="Tulis ide atau catatan…"
          aria-label="Isi sticky note"
          className="h-full w-full resize-none bg-transparent text-sm leading-snug outline-none placeholder:opacity-50"
        />
        <span
          data-resize={node.id}
          className="absolute bottom-0.5 right-0.5 size-4 cursor-nwse-resize"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${c.ink}55 50%)`,
            borderBottomRightRadius: 10,
          }}
        />
      </div>
      <ConnectHandles id={node.id} visible={selected} />
    </div>
  );
}
