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

/** Tumpukan avatar bulat kecil (anggota kelompok), warna diturunkan dari palet node. */
function AvatarStack({ names }: { names: string[] }) {
  const colors = [PALETTE.blue.solid, PALETTE.orange.solid, PALETTE.green.solid, PALETTE.purple.solid, PALETTE.pink.solid];
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
  className = "",
}: {
  title: string;
  color: keyof typeof PALETTE;
  lines?: number;
  pill?: string;
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
      </div>
    </div>
  );
}

function GroupCard({ members, className = "" }: { members: string[]; className?: string }) {
  const colors = [PALETTE.blue.solid, PALETTE.orange.solid, PALETTE.green.solid, PALETTE.purple.solid, PALETTE.pink.solid];
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
      {/* Garis konektor lembut, meniru garis edge asli kanvas (slate, tanpa panah tegas) */}
      <svg
        className="absolute inset-0 size-full pointer-events-none"
        viewBox="0 0 560 560"
        fill="none"
      >
        <path d="M 40 300 C 110 300, 110 150, 190 150" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 40 300 C 110 300, 110 300, 190 300" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 40 300 C 110 300, 110 450, 190 450" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 190 180 V 270" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 330 150 C 370 150, 370 110, 420 110" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 330 300 C 370 300, 370 370, 420 370" stroke="#cbd5e1" strokeWidth="2" fill="none" />
        <path d="M 420 350 V 230" stroke="#cbd5e1" strokeWidth="2" fill="none" />
      </svg>

      {/* 1. Card To-Do List & Cursor Adit */}
      <MiniCard title="To-Do List" color="blue" pill="Live" className="absolute left-[180px] top-[100px]" />
      <Cursor color={CURSOR_COLORS.blue} label="Adit" rotate={-25} className="left-[280px] top-[165px]" />

      {/* 2. Card Tracker & Cursor Budi + Clara */}
      <MiniCard title="Tracker" color="orange" lines={2} pill="Live" className="absolute left-[180px] top-[260px]" />
      <Cursor color={CURSOR_COLORS.orange} label="Budi" rotate={0} className="left-[285px] top-[320px]" />
      <Cursor color={CURSOR_COLORS.green} label="Clara" rotate={20} className="left-[140px] top-[350px]" />

      {/* 3. Card Deadline & Cursor Doni */}
      <MiniCard title="Deadline" color="yellow" lines={2} pill="Manual" className="absolute left-[180px] top-[410px]" />
      <Cursor color={CURSOR_COLORS.slate} label="Doni" rotate={35} className="left-[290px] top-[475px]" />

      {/* 4. Group Card TA 1 & Avatar Stack */}
      <GroupCard members={["Adit", "Budi", "Clara"]} className="absolute left-[410px] top-[70px]" />
      <div className="absolute left-[425px] top-[180px] z-10">
        <AvatarStack names={["A", "B", "C"]} />
      </div>

      {/* 5. Group Card TA 2 & Cursor user2 */}
      <GroupCard members={["user2"]} className="absolute left-[410px] top-[330px]" />
      <Cursor color={CURSOR_COLORS.purple} label="user2" rotate={-10} className="left-[420px] top-[425px]" />
    </div>
  );
}
