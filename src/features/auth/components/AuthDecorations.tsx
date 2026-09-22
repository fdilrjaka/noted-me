import { LayoutGrid, Maximize2, Minus, Plus, Settings, Smile, Sparkles, Play } from "lucide-react";

/**
 * Sticky note kertas tempel dekoratif dengan sudut lipatan dan tulisan tangan.
 */
function StickyNote({
  lines,
  fill,
  fold,
  width,
  height,
  className = "",
  hasHeart = false,
}: {
  lines: [string, string];
  fill: string;
  fold: string;
  width: number;
  height: number;
  className?: string;
  hasHeart?: boolean;
}) {
  const foldSize = Math.round(width * 0.16);
  return (
    <div className={className} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 drop-shadow-[0_6px_14px_rgba(120,90,20,0.1)]"
      >
        <rect x="0" y="0" width={width} height={height} rx="6" fill={fill} />
        {/* Garis kertas tipis */}
        {[0.42, 0.6, 0.78].map((f) => (
          <line
            key={f}
            x1={width * 0.14}
            x2={width * 0.86}
            y1={height * f}
            y2={height * f}
            stroke="#000"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
        ))}
        {/* Sudut lipatan kertas tempel */}
        <path
          d={`M ${width - foldSize} ${height} L ${width} ${height} L ${width} ${height - foldSize} Z`}
          fill={fold}
        />
        <path
          d={`M ${width - foldSize} ${height} L ${width} ${height - foldSize} L ${width - foldSize} ${height - foldSize} Z`}
          fill={fill}
          fillOpacity="0.6"
        />
      </svg>
      <div
        className="relative flex h-full flex-col items-center justify-center gap-0.5 px-3 text-center text-[12.5px] leading-tight text-amber-950 select-none"
        style={{ fontFamily: "'Caveat', 'Segoe Print', cursive, sans-serif" }}
      >
        <span>{lines[0]}</span>
        <span className="flex items-center gap-1 font-medium">
          {lines[1]}
          {hasHeart && <span className="text-rose-500 font-sans text-xs">♡</span>}
        </span>
      </div>
    </div>
  );
}

export function AuthDecorations() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Sticky note kanan atas: "Your Notes Your Story" */}
      <StickyNote
        lines={["Your Notes", "Your Story -"]}
        fill="#fef08a"
        fold="#fde047"
        width={136}
        height={86}
        className="absolute right-8 top-8 rotate-[3.5deg] sm:right-16 sm:top-12"
      />

      {/* Sticky note kiri bawah: "Better Notes Bigger Dreams ♡" */}
      <StickyNote
        lines={["Better Notes", "Bigger Dreams"]}
        fill="#fef9c3"
        fold="#fde047"
        width={140}
        height={100}
        hasHeart
        className="absolute -left-2 bottom-12 -rotate-[5deg] sm:left-10 sm:bottom-16"
      />

      {/* Mini floating dock ikon kiri vertikal (tanpa logo) */}
      <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xs backdrop-blur-md lg:flex">
        <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <LayoutGrid className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
          <Play className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
          <Sparkles className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
          <Smile className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
          <Settings className="size-4" />
        </span>
      </div>

      {/* Kontrol zoom & smiley di pojok kanan bawah */}
      <div className="absolute bottom-6 right-6 hidden items-center gap-2 sm:flex">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
          <Minus className="size-3.5 cursor-pointer text-slate-400 hover:text-slate-700" />
          <span className="px-1 text-slate-600">100%</span>
          <Plus className="size-3.5 cursor-pointer text-slate-400 hover:text-slate-700" />
          <span className="mx-1 h-3 w-px bg-slate-200" />
          <Maximize2 className="size-3.5 text-slate-400" />
        </div>

        {/* Kotak senyum kecil */}
        <span className="flex size-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 border border-purple-200/60 shadow-2xs">
          <Smile className="size-4" />
        </span>
      </div>
    </div>
  );
}