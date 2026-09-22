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
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-sm ${className}`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

/** Tumpukan avatar bulat kecil (anggota kelompok), warna diturunkan dari palet node. */
function AvatarStack({ names }: { names: string[] }) {
  const colors = [
    PALETTE.blue.solid,
    PALETTE.orange.solid,
    PALETTE.green.solid,
    PALETTE.purple.solid,
    PALETTE.pink.solid,
  ];
  return (
    <div className="flex -space-x-1.5">
      {names.map((n, i) => (
        <span
          key={n + i}
          className="flex size-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: colors[i % colors.length] }}
        >
          {n[0]?.toUpperCase()}
        </span>
      ))}
    </div>
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
}: {
  title: string;
  color: keyof typeof PALETTE;
  lines?: number;
  pill?: string;
  /** Tombol aksi kecil di footer kartu, mis. "+ Add" / "Detail" — meniru referensi. */
  footer?: string;
  footerColor?: string;
  className?: string;
}) {
  const c = PALETTE[color];
  return (
    <div
      className={`w-44 overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)] z-10 ${className}`}
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

function GroupCard({ members, className = "" }: { members: string[]; className?: string }) {
  const colors = [
    PALETTE.blue.solid,
    PALETTE.orange.solid,
    PALETTE.green.solid,
    PALETTE.purple.solid,
    PALETTE.pink.solid,
  ];
  return (
    <div
      className={`w-44 overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)] z-10 ${className}`}
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
export function CollabIllustration() {
  return (
    <div className="relative hidden h-[34rem] w-full max-w-xl lg:block" aria-hidden="true">
      {/* Garis konektor melengkung berwarna, meniru "kabel" penghubung kartu di referensi. */}
      <svg
        className="absolute inset-0 size-full pointer-events-none"
        viewBox="0 0 560 560"
        fill="none"
      >
        <path d="M 190 150 C 300 150, 300 90, 420 90" stroke="#93c5fd" strokeWidth="2.5" />
        <path d="M 190 300 C 300 300, 320 260, 420 250" stroke="#fdba74" strokeWidth="2.5" />
        <path d="M 190 410 C 300 410, 320 340, 420 330" stroke="#fdba74" strokeWidth="2.5" />
        <path d="M 420 150 C 460 150, 460 250, 460 250" stroke="#c4b5fd" strokeWidth="2.5" />
        <path d="M 420 410 C 460 410, 460 350, 460 350" stroke="#c4b5fd" strokeWidth="2.5" />
      </svg>

      {/* 1. Card To-Do List */}
      <MiniCard
        title="To-Do List"
        color="blue"
        pill="Lihat"
        footer="+ Add"
        className="absolute left-[180px] top-[100px]"
      />

      {/* 2. Card Tracker */}
      <MiniCard
        title="Tracker"
        color="orange"
        lines={2}
        pill="Lihat"
        footer="+ Buat"
        className="absolute left-[180px] top-[260px]"
      />

      {/* 3. Card Deadlines */}
      <MiniCard
        title="Deadlines"
        color="yellow"
        lines={2}
        pill="Mandiri"
        footer="Detail"
        footerColor={PALETTE.slate.solid}
        className="absolute left-[180px] top-[410px]"
      />

      {/* 4. Group Card TA 1 & pil "+ User2" */}
      <GroupCard
        members={["Asri", "Budi", "Clara", "Dika"]}
        className="absolute left-[410px] top-[70px]"
      />
      <ActionPill
        label="+ User2"
        color={PALETTE.purple.solid}
        className="left-[430px] top-[228px]"
      />

      {/* 5. Group Card TA 2 & pil "+ User2" */}
      <GroupCard members={["user2"]} className="absolute left-[410px] top-[330px]" />
      <ActionPill
        label="+ User2"
        color={PALETTE.purple.solid}
        className="left-[430px] top-[420px]"
      />
    </div>
  );
}
