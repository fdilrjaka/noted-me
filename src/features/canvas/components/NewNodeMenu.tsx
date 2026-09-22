import { useState } from "react";
import { Plus, Table2 } from "lucide-react";
import { addNode, canvasUid, type ColorKey, type NodeKind } from "@/lib/noteme/canvasStore";
import { TODO_CATEGORIES } from "@/lib/noteme/todoStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DEFAULT_COLOR, DEFAULT_TITLE } from "../palette";

const NODE_OPTIONS: { kind: NodeKind; label: string }[] = [
  { kind: "todo", label: "To-Do List (Live)" },
  { kind: "tracker", label: "Tracker Tugas (Live)" },
  { kind: "schedule", label: "Jadwal (Live)" },
  { kind: "note", label: "Catatan Kuliah (Live)" },
  { kind: "sticky", label: "Sticky Note" },
];

/** Titik dunia tempat node baru muncul: tengah layar saat ini. */
function spawnPoint(center: () => { x: number; y: number }) {
  const p = center();
  return { x: Math.round(p.x - 150), y: Math.round(p.y - 90) };
}

function buildNode(kind: NodeKind, x: number, y: number, color: ColorKey) {
  const base = { id: canvasUid(), x, y, title: DEFAULT_TITLE[kind], color, pinned: false };
  switch (kind) {
    case "todo":
    case "tracker":
      return { ...base, kind, categoryId: TODO_CATEGORIES[0]!.id, w: 300, h: null };
    case "schedule":
      return { ...base, kind, w: 300, h: null };
    case "note":
      return { ...base, kind, subjectId: null, w: 280, h: null };
    case "sticky":
      return { ...base, kind, text: "", w: 220, h: 150 };
    case "table":
      return {
        ...base,
        kind,
        w: 320,
        h: null,
        cells: [
          ["Kolom 1", "Kolom 2"],
          ["", ""],
          ["", ""],
        ],
      };
    case "frame":
      return { ...base, kind, w: 640, h: 420, collapsed: false };
  }
}

export function NewNodeMenu({ getCenter }: { getCenter: () => { x: number; y: number } }) {
  const [open, setOpen] = useState(false);

  const create = (kind: NodeKind) => {
    const { x, y } = spawnPoint(getCenter);
    addNode(buildNode(kind, x, y, DEFAULT_COLOR[kind]) as never);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="press-sm flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="size-4.5" /> New Node
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          {NODE_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.kind} onSelect={() => create(o.kind)}>
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => create("table")}
        title="Tambah tabel"
        className="press-sm flex h-10 items-center gap-1.5 rounded-xl border border-slate-300/70 bg-white/60 px-4 text-sm font-semibold hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Table2 className="size-4" /> Table
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="press-sm flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus className="size-4.5" /> New Frame
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl">
          <DropdownMenuItem onSelect={() => create("frame")}>Frame kosong</DropdownMenuItem>
          <DropdownMenuSeparator />
          <span className="block px-2 py-1.5 text-xs text-muted-foreground">
            Seret node ke dalam frame untuk mengelompokkannya.
          </span>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
