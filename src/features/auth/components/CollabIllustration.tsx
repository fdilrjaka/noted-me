import React from "react";
import { PALETTE } from "@/features/canvas/palette";

const CURSOR_COLORS = {
  blue: PALETTE.blue.solid,
  orange: PALETTE.orange.solid,
  green: PALETTE.green.solid,
  purple: PALETTE.purple.solid,
  slate: PALETTE.slate.solid,
} as const;

/** Panah kursor kecil bergaya "multiplayer cursor" dengan label nama di sampingnya. */
function Cursor({
  color,
  label,
  className = "",
  rotate = -20,
}: {
  color: string;
  label: string;
  className?: string;
  rotate?: number;
}) {
  return (
    <div className={`pointer-events-none absolute flex items-start gap-1.5 z-20 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 size-5 flex-none drop-shadow-sm"
        style={{ transform: `rotate(${rotate}deg)` }}
        fill={color}
      >
        <path d="M4 2l14 6.2-5.8 1.7-1.3 5.9L4 2z" stroke="white" strokeWidth="1" />
      </svg>
      <span
        className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
}

/** Pil kecil bergaya tombol aksi kartu (mis. "+ Add", "Lihat", "Detail"). */
function ActionPill({
  label,
  color,
  className = "",
  style,
}: {
  label: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`pointer-events-none z-20 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-sm ${className}`}
      style={{ ...style, backgroundColor: color }}
    >
      {label}
    </span>
  );
}

/**
 * Kartu mini bergaya kartu node kanvas asli: bilah judul solid berwarna + badan putih,
 * bukan kotak generik dengan border tipis + garis aksen — supaya konsisten dengan
 * NodeShell yang dipakai di dashboard/kanvas sungguhan.
 */
function MiniCard({
  title,
  color,
  lines = 3,
  pill,
  footer,
  footerColor,
  className = "",
  style,
}: {
  title: string;
  color: keyof typeof PALETTE;
  lines?: number;
  pill?: string;
  /** Tombol aksi kecil di footer kartu, mis. "+ Add" / "Detail" — meniru referensi. */
  footer?: string;
  footerColor?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const c = PALETTE[color];
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)] z-10 ${className}`}
      style={style}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white"
        style={{ backgroundColor: c.solid }}
      >
        <span className="truncate">{title}</span>
        {pill && (
          <span className="ml-auto flex-none rounded-full bg-white/25 px-1.5 py-0.5 text-[9px] font-semibold">
            {pill}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2.5 flex-none rounded-[3px] border-2"
              style={{ borderColor: c.solid, backgroundColor: i === 0 ? c.solid : "transparent" }}
            />
            <span
              className="h-1.5 rounded-full"
              style={{ width: `${75 - i * 15}%`, backgroundColor: c.soft }}
            />
          </div>
        ))}
        {footer && (
          <div className="mt-0.5 flex justify-end">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: footerColor ?? c.solid }}
            >
              {footer}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  members,
  className = "",
  style,
}: {
  members: string[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const colors = [
    PALETTE.blue.solid,
    PALETTE.orange.solid,
    PALETTE.green.solid,
    PALETTE.purple.solid,
    PALETTE.pink.solid,
  ];
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)] z-10 ${className}`}
      style={style}
    >
      <div
        className="px-3 py-1.5 text-[12px] font-semibold text-white"
        style={{ backgroundColor: PALETTE.slate.solid }}
      >
        Kelompok TA
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {members.map((m, i) => (
          <div key={m + i} className="flex items-center gap-2">
            <span
              className="flex size-4.5 flex-none items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: colors[i % colors.length] }}
            >
              {m[0]?.toUpperCase()}
            </span>
            <span className="text-[11px] font-medium text-slate-600">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Ilustrasi statis kolaboratif yang menggambarkan tim sedang menyusun dashboard
 * di kanvas tak terbatas — kartunya meniru gaya NodeShell asli (bilah judul solid,
 * badan putih, shadow lembut) supaya tidak terasa seperti mockup generik.
 */
/** Kotak posisi (x, y, lebar, tinggi) tiap kartu — dipakai bareng untuk penempatan
 * kartu ITU SENDIRI dan untuk menghitung titik ujung garis konektor, supaya garis
 * selalu nempel pas di tepi kartu (tidak ada celah/putus seperti sebelumnya). */
const TODO = { x: 180, y: 96, w: 176, h: 156 };
const TRACKER = { x: 180, y: 268, w: 176, h: 132 };
const DEADLINES = { x: 180, y: 416, w: 176, h: 132 };
const GROUP1 = { x: 424, y: 64, w: 176, h: 176 };
const GROUP2 = { x: 424, y: 334, w: 176, h: 92 };
const PILL1 = { x: 452, y: GROUP1.y + GROUP1.h + 14 };
const PILL2 = { x: 452, y: GROUP2.y + GROUP2.h + 14 };
const VIEW_W = 640;
const VIEW_H = 580;

const rightMid = (b: { x: number; y: number; w: number; h: number }) => ({
  x: b.x + b.w,
  y: b.y + b.h / 2,
});
const leftMid = (b: { x: number; y: number; w: number; h: number }) => ({
  x: b.x,
  y: b.y + b.h / 2,
});

/** Garis kurva mulus dari tepi kanan kartu A ke tepi kiri kartu B — kontrol
 * poin di tengah horizontal supaya lengkungannya rapi seperti "kabel" pada referensi. */
function connectorPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

export function CollabIllustration() {
  const todoToGroup1 = connectorPath(rightMid(TODO), leftMid(GROUP1));
  const trackerToGroup2 = connectorPath(rightMid(TRACKER), leftMid(GROUP2));
  const deadlinesToGroup2 = connectorPath(rightMid(DEADLINES), leftMid(GROUP2));
  const group1ToPill1 = `M ${GROUP1.x + 56} ${GROUP1.y + GROUP1.h} V ${PILL1.y + 8}`;
  const group2ToPill2 = `M ${GROUP2.x + 56} ${GROUP2.y + GROUP2.h} V ${PILL2.y + 8}`;

  return (
    <div
      className="relative hidden w-full max-w-2xl lg:block"
      style={{ height: VIEW_H }}
      aria-hidden="true"
    >
      {/* Garis konektor melengkung berwarna, meniru "kabel" penghubung kartu di referensi —
          titik ujungnya dihitung dari kotak posisi kartu di atas, jadi selalu nempel pas. */}
      <svg
        className="absolute inset-0 size-full pointer-events-none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="none"
      >
        <path d={todoToGroup1} stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <path d={trackerToGroup2} stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" />
        <path d={deadlinesToGroup2} stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" />
        <path d={group1ToPill1} stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
        <path d={group2ToPill2} stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* 1. Card To-Do List */}
      <MiniCard
        title="To-Do List"
        color="blue"
        pill="Lihat"
        footer="+ Add"
        className="absolute"
        style={{ left: TODO.x, top: TODO.y, width: TODO.w }}
      />

      {/* 2. Card Tracker */}
      <MiniCard
        title="Tracker"
        color="orange"
        lines={2}
        pill="Lihat"
        footer="+ Buat"
        className="absolute"
        style={{ left: TRACKER.x, top: TRACKER.y, width: TRACKER.w }}
      />

      {/* 3. Card Deadlines */}
      <MiniCard
        title="Deadlines"
        color="yellow"
        lines={2}
        pill="Mandiri"
        footer="Detail"
        footerColor={PALETTE.slate.solid}
        className="absolute"
        style={{ left: DEADLINES.x, top: DEADLINES.y, width: DEADLINES.w }}
      />

      {/* 4. Group Card TA 1 & pil "+ User2" */}
      <GroupCard
        members={["Asri", "Budi", "Clara", "Dika"]}
        className="absolute"
        style={{ left: GROUP1.x, top: GROUP1.y, width: GROUP1.w }}
      />
      <ActionPill
        label="+ User2"
        color={PALETTE.purple.solid}
        className="absolute"
        style={{ left: PILL1.x, top: PILL1.y }}
      />

      {/* 5. Group Card TA 2 & pil "+ User2" */}
      <GroupCard
        members={["user2"]}
        className="absolute"
        style={{ left: GROUP2.x, top: GROUP2.y, width: GROUP2.w }}
      />
      <ActionPill
        label="+ User2"
        color={PALETTE.purple.solid}
        className="absolute"
        style={{ left: PILL2.x, top: PILL2.y }}
      />
    </div>
  );
}
