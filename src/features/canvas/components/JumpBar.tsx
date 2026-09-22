import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CanvasNode, Viewport } from "@/lib/noteme/canvasStore";
import { nodeRect, type Size } from "../geometry";

/** Search bar top bar: cari node berdasarkan judul, klik hasil untuk auto-pan kamera ke sana. */
export function JumpBar({
  nodes,
  sizes,
  viewSize,
  onJump,
}: {
  nodes: CanvasNode[];
  sizes: Record<string, Size>;
  viewSize: { w: number; h: number };
  onJump: (viewport: Viewport, nodeId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return nodes.filter((n) => n.title.toLowerCase().includes(query)).slice(0, 6);
  }, [q, nodes]);

  const jump = (n: CanvasNode) => {
    const r = nodeRect(n, sizes);
    const zoom = 1;
    onJump(
      {
        zoom,
        x: viewSize.w / 2 - (r.x + r.w / 2) * zoom,
        y: viewSize.h / 2 - (r.y + r.h / 2) * zoom,
      },
      n.id,
    );
    setQ("");
    setFocused(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && jump(results[0])}
        placeholder="Cari catatan, jadwal... [Jump to...]"
        aria-label="Cari & lompat ke node"
        className="h-10 w-full rounded-xl border border-slate-300/70 bg-white/60 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 dark:border-white/15 dark:bg-white/5"
      />
      {focused && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
          {results.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => jump(n)}
                className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="truncate">{n.title}</span>
                <span className="flex-none pl-2 text-xs text-muted-foreground">{n.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
