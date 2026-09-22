import {
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Maximize2,
  Minus,
  NotebookText,
  Plus,
  Settings,
  Smile,
} from "lucide-react";

/**
 * Elemen dekoratif halaman auth: sticky note kecil dengan tulisan tangan dan coretan
 * (doodle) tipis di sekitar konten utama. Statis & pointer-events-none — murni hiasan.
 * (Blob warna besar di pojok sudah dihapus — kontras gelapnya merusak keterbacaan judul.)
 *
 * Juga berisi "mini sidebar" ikon kiri, pill badge NoteMe, dan kontrol zoom/fullscreen
 * di pojok kanan bawah — semuanya aksesoris murni, tidak ada fungsi/onClick apa pun.
 */
/**
 * Kertas tempel dengan lipatan sudut (dog-ear), garis kertas tipis, dan tulisan tangan
 * bergaris bawah — biar terasa seperti kertas beneran, bukan kotak warna polos.
 */
function StickyNote({
  lines,
  fill,
  fold,
  width,
  height,
  className = "",
}: {
  lines: [string, string];
  fill: string;
  fold: string;
  width: number;
  height: number;
  className?: string;
}) {
  const foldSize = Math.round(width * 0.16);
  return (
    <div className={className} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 drop-shadow-[0_8px_14px_rgba(120,90,20,0.18)]"
      >
        <rect x="0" y="0" width={width} height={height} rx="4" fill={fill} />
        {/* garis kertas tipis */}
        {[0.42, 0.6, 0.78].map((f) => (
          <line
            key={f}
            x1={width * 0.14}
            x2={width * 0.86}
            y1={height * f}
            y2={height * f}
            stroke="#000"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
        ))}
        {/* lipatan sudut kanan bawah */}
        <path
          d={`M ${width - foldSize} ${height} L ${width} ${height} L ${width} ${height - foldSize} Z`}
          fill={fold}
        />
        <path
          d={`M ${width - foldSize} ${height} L ${width} ${height - foldSize} L ${width - foldSize} ${height - foldSize} Z`}
          fill={fill}
          fillOpacity="0.55"
        />
      </svg>
      <div
        className="relative flex h-full flex-col items-center justify-center gap-0.5 px-3 text-center text-[13px] leading-tight text-amber-900"
        style={{ fontFamily: "cursive" }}
      >
        <span>{lines[0]}</span>
        <span className="relative">
          {lines[1]}
          <svg
            className="absolute -bottom-1.5 left-0 w-full text-amber-700/50"
            height="6"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
          >
            <path
              d="M2 3 Q 25 0, 50 3 T 98 3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function AuthDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Sticky note kanan atas: "Your Notes Your Story" */}
      <StickyNote
        lines={["Your Notes", "Your Story"]}
        fill="#fde68a"
        fold="#f6cf5b"
        width={150}
        height={92}
        className="absolute right-6 top-6 rotate-[6deg] sm:right-14 sm:top-10"
      />

      {/* Sticky note kiri bawah: "Better Notes Bigger Dreams" */}
      <StickyNote
        lines={["Better Notes", "Bigger Dreams"]}
        fill="#fef3c7"
        fold="#fbe4a1"
        width={144}
        height={112}
        className="absolute -left-3 bottom-10 -rotate-[8deg] sm:left-10 sm:bottom-16"
      />

      {/* Coretan tangan kecil dekat judul */}
      <svg
        className="absolute left-[300px] top-[150px] hidden h-10 w-10 text-indigo-400 lg:block"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path d="M4 30 L14 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 34 L28 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* Bulan/ayunan kecil dekat form */}
      <svg
        className="absolute bottom-24 right-[15%] hidden h-8 w-8 text-indigo-400 lg:block"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M20 13a8 8 0 1 1-9-9 6.5 6.5 0 0 0 9 9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Mini sidebar ikon kiri — murni aksesoris, cuma buat kesan "ini NoteMe" di layar login */}
      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-xl lg:flex">
        {[LayoutDashboard, NotebookText, LayoutGrid, CalendarDays, Settings].map((Icon, i) => (
          <span
            key={i}
            className={`flex size-9 items-center justify-center rounded-xl ${
              i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-[18px]" />
          </span>
        ))}
      </div>

      {/* Pill badge produk — pojok kiri bawah */}
      <div className="absolute bottom-6 left-6 hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xl sm:flex">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        NoteMe
      </div>

      {/* Kontrol zoom & fullscreen + widget karakter — pojok kanan bawah */}
      <div className="absolute bottom-6 right-6 hidden items-center gap-2 sm:flex">
        <div className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-2 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-xl">
          <Minus className="size-3.5" />
          <span className="px-1">100%</span>
          <Plus className="size-3.5" />
        </div>
        <span className="flex size-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-muted-foreground shadow-sm backdrop-blur-xl">
          <Maximize2 className="size-3.5" />
        </span>
        <span className="flex size-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-amber-500 shadow-sm backdrop-blur-xl">
          <Smile className="size-4" />
        </span>
      </div>
    </div>
  );
}
