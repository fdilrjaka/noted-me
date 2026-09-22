import type { CanvasNode } from "@/lib/noteme/canvasStore";
import { FrameNodeView } from "./FrameNodeView";
import type { OnSize } from "./NodeShell";
import { NoteNodeView } from "./NoteNode";
import { ScheduleNodeView } from "./ScheduleNode";
import { StickyNodeView } from "./StickyNode";
import { TableNodeView } from "./TableNode";
import { TodoNodeView } from "./TodoNode";
import { TrackerNodeView } from "./TrackerNode";

export function NodeView({
  node,
  selected,
  onSize,
}: {
  node: CanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  switch (node.kind) {
    case "todo":
      return <TodoNodeView node={node} selected={selected} onSize={onSize} />;
    case "schedule":
      return <ScheduleNodeView node={node} selected={selected} onSize={onSize} />;
    case "tracker":
      return <TrackerNodeView node={node} selected={selected} onSize={onSize} />;
    case "note":
      return <NoteNodeView node={node} selected={selected} onSize={onSize} />;
    case "sticky":
      return <StickyNodeView node={node} selected={selected} onSize={onSize} />;
    case "table":
      return <TableNodeView node={node} selected={selected} onSize={onSize} />;
    case "frame":
      return <FrameNodeView node={node} selected={selected} />;
  }
}
