import React from "react";

const CURSOR_COLORS = {
  blue: "#2563eb",
  orange: "#ea580c",
  green: "#16a34a",
  purple: "#7c3aed",
  slate: "#334155",
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

/** Tumpukan avatar bulat kecil (anggota kelompok), warna diturunkan dari inisial. */
function AvatarStack({ names }: { names: string[] }) {
  const colors = ["#2563eb", "#ea580c", "#16a34a", "#7c3aed", "#ec4899"];
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

function MiniCard({
  title,
  accent,
  lines = 3,
  className = "",
}: {
  title: string;
  accent?: string;
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-44 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-md backdrop-blur-sm z-10 ${className}`}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
    >
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2 flex-none rounded-[2px] border border-slate-300" />
            <span
              className="h-1.5 rounded-full bg-slate-200"
              style={{ width: `${75 - i * 15}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupCard({ members, className = "" }: { members: string[]; className?: string }) {
  const colors = ["#2563eb", "#ea580c", "#16a34a", "#7c3aed", "#ec4899"];
  return (
    <div
      className={`w-44 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-md backdrop-blur-sm z-10 ${className}`}
    >
      <p className="text-xs font-semibold text-slate-700">Kelompok TA</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {members.map((m, i) => (
          <div key={m + i} className="flex items-center gap-2">
            <span
              className="flex size-4.5 flex-none items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: colors[i % colors.length] }}
            >
              {m[0]?.toUpperCase()}
            </span>
            <span className="text-[11px] text-slate-600 font-medium">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Ilustrasi statis kolaboratif yang menggambarkan tim sedang menyusun dashboard
 * di kanvas tak terbatas.
 */
export function CollabIllustration() {
  return (
    <div className="relative hidden h-[34rem] w-full max-w-xl lg:block" aria-hidden="true">
      {/* Garis-garis Konektor SVG (Solid Tanpa Putus-Putus) */}
      <svg
        className="absolute inset-0 size-full pointer-events-none"
        viewBox="0 0 560 560"
        fill="none"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Cabang Alur Utama dari Kiri */}
        <path
          d="M 40 300 C 110 300, 110 150, 190 150"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 40 300 C 110 300, 110 300, 190 300"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 40 300 C 110 300, 110 450, 190 450"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Garis Penghubung Vertikal / Antar Kartu */}
        <path d="M 190 180 V 270" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
        <path
          d="M 330 150 C 370 150, 370 110, 420 110"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#arrow)"
        />
        <path
          d="M 330 300 C 370 300, 370 370, 420 370"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#arrow)"
        />
        <path
          d="M 420 350 V 230"
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#arrow)"
        />
      </svg>

      {/* 1. Card To-Do List & Cursor Adit */}
      <MiniCard title="To-Do List" accent="#2563eb" className="absolute left-[180px] top-[100px]" />
      <Cursor
        color={CURSOR_COLORS.blue}
        label="Adit"
        rotate={-25}
        className="left-[280px] top-[165px]"
      />

      {/* 2. Card Tracker & Cursor Budi + Clara */}
      <MiniCard
        title="Tracker"
        accent="#ea580c"
        lines={2}
        className="absolute left-[180px] top-[260px]"
      />
      <Cursor
        color={CURSOR_COLORS.orange}
        label="Budi"
        rotate={0}
        className="left-[285px] top-[320px]"
      />
      <Cursor
        color={CURSOR_COLORS.green}
        label="Clara"
        rotate={20}
        className="left-[140px] top-[350px]"
      />

      {/* 3. Card Deadline & Cursor Doni */}
      <MiniCard
        title="Deadline"
        accent="#f59e0b"
        lines={2}
        className="absolute left-[180px] top-[410px]"
      />
      <Cursor
        color={CURSOR_COLORS.slate}
        label="Doni"
        rotate={35}
        className="left-[290px] top-[475px]"
      />

      {/* 4. Group Card TA 1 & Avatar Stack */}
      <GroupCard members={["Adit", "Budi", "Clara"]} className="absolute left-[410px] top-[70px]" />
      <div className="absolute left-[425px] top-[180px] z-10">
        <AvatarStack names={["A", "B", "C"]} />
      </div>

      {/* 5. Group Card TA 2 & Cursor user2 */}
      <GroupCard members={["user2"]} className="absolute left-[410px] top-[330px]" />
      <Cursor
        color={CURSOR_COLORS.purple}
        label="user2"
        rotate={-10}
        className="left-[420px] top-[425px]"
      />
    </div>
  );
}
