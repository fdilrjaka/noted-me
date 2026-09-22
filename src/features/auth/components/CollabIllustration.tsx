import React from "react";
import { CheckSquare, BarChart2, Calendar, Users, User, GripVertical } from "lucide-react";

/**
 * Kartu mini bergaya node kanvas tak terbatas NoteMe.
 * Didesain lebih profesional, bersih, dan modern mengikuti referensi visual.
 */
function MiniCard({
  title,
  icon: Icon,
  headerBg,
  pill,
  pillBg = "bg-white/20",
  pillText = "text-white",
  children,
  footer,
  footerBg,
  className = "",
  style,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerBg: string;
  pill?: string;
  pillBg?: string;
  pillText?: string;
  children: React.ReactNode;
  footer?: string;
  footerBg?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] border border-slate-100/90 z-10 transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      style={style}
    >
      <div className={`flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-white ${headerBg}`}>
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span>{title}</span>
        </div>
        {pill && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillBg} ${pillText}`}>
            {pill}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3.5">
        {children}
        {footer && (
          <div className="mt-1 flex justify-end">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-sm ${
                footerBg ?? headerBg
              }`}
            >
              {footer}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const VIEW_W = 660;
const VIEW_H = 480;

// Posisi & dimensi node-node kanvas
const CATATAN = { x: 30, y: 220, w: 70, h: 28 };
const TODO = { x: 140, y: 30, w: 180, h: 142 };
const TRACKER = { x: 130, y: 195, w: 186, h: 132 };
const DEADLINES = { x: 140, y: 350, w: 180, h: 122 };

const GROUP1 = { x: 380, y: 20, w: 180, h: 186 };
const GROUP2 = { x: 380, y: 270, w: 180, h: 110 };

const PILL1 = { x: 420, y: GROUP1.y + GROUP1.h + 12 };
const PILL2 = { x: 420, y: GROUP2.y + GROUP2.h + 12 };

// Target masuk ke kartu login di kanan
const AUTH_TARGET = { x: 650, y: 110 };

function rightMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x + b.w, y: b.y + b.h / 2 };
}
function leftMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x, y: b.y + b.h / 2 };
}

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }, curviness = 0.5) {
  const dx = (to.x - from.x) * curviness;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

function ConnectorDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5" fill="white" />
      <circle cx={x} cy={y} r="5" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx={x} cy={y} r="2" fill={color} />
    </g>
  );
}

export function CollabIllustration() {
  const catatanRight = rightMid(CATATAN);
  const trackerLeft = leftMid(TRACKER);
  const trackerRight = rightMid(TRACKER);

  const todoRight = rightMid(TODO);
  const group1Left = leftMid(GROUP1);
  const group1Right = rightMid(GROUP1);

  const deadlinesRight = rightMid(DEADLINES);
  const group2Left = leftMid(GROUP2);

  const catatanToTracker = curvePath(catatanRight, trackerLeft);
  const todoToGroup1 = curvePath(todoRight, group1Left);
  const trackerToGroup2 = curvePath(trackerRight, group2Left);
  const deadlinesToGroup2 = curvePath(deadlinesRight, group2Left);
  const group1ToAuth = curvePath(group1Right, AUTH_TARGET, 0.6);

  const BLUE = "#3b82f6";
  const ORANGE = "#f97316";
  const PURPLE = "#8b5cf6";

  return (
    <div
      className="relative hidden w-full max-w-2xl lg:block select-none pointer-events-none"
      style={{ height: VIEW_H }}
      aria-hidden="true"
    >
      {/* Garis-garis kabel konektor antar node yang presisi & rapi */}
      <svg
        className="absolute inset-0 size-full overflow-visible pointer-events-none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="none"
      >
        <defs>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* Kabel kiri dari Catatan ke Tracker */}
        <path d="M 0 234 Q 20 234, 30 234" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />
        <path d={catatanToTracker} stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />

        {/* Kabel To-Do ke Kelompok TA 1 */}
        <path d={todoToGroup1} stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />

        {/* Kabel Tracker ke Kelompok TA 2 */}
        <path d={trackerToGroup2} stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />

        {/* Kabel Deadlines ke Kelompok TA 2 */}
        <path d={deadlinesToGroup2} stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />

        {/* Kabel vertikal dari Group ke Pill + User2 */}
        <path
          d={`M ${GROUP1.x + 60} ${GROUP1.y + GROUP1.h} V ${PILL1.y + 6}`}
          stroke={PURPLE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${GROUP2.x + 60} ${GROUP2.y + GROUP2.h} V ${PILL2.y + 6}`}
          stroke={PURPLE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Kabel utama dari Kelompok TA 1 mengalir mulus ke arah Form Login di kanan */}
        <path d={group1ToAuth} stroke="url(#purpleGradient)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Dots konektor */}
        <ConnectorDot x={catatanRight.x} y={catatanRight.y} color={ORANGE} />
        <ConnectorDot x={trackerLeft.x} y={trackerLeft.y} color={ORANGE} />
        <ConnectorDot x={todoRight.x} y={todoRight.y} color={BLUE} />
        <ConnectorDot x={group1Left.x} y={group1Left.y} color={BLUE} />
        <ConnectorDot x={group1Right.x} y={group1Right.y} color={PURPLE} />
        <ConnectorDot x={trackerRight.x} y={trackerRight.y} color={ORANGE} />
        <ConnectorDot x={group2Left.x} y={group2Left.y} color={ORANGE} />
        <ConnectorDot x={deadlinesRight.x} y={deadlinesRight.y} color={ORANGE} />
      </svg>

      {/* 0. Pil Kecil "Catatan" di sisi kiri */}
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm"
        style={{ left: CATATAN.x, top: CATATAN.y }}
      >
        Catatan
      </div>

      {/* 1. Card To-Do List (Biru) */}
      <MiniCard
        title="To-Do List"
        icon={CheckSquare}
        headerBg="bg-blue-600"
        pill="Lihat"
        pillBg="bg-blue-500/80"
        footer="+ Add"
        footerBg="bg-blue-600"
        className="absolute"
        style={{ left: TODO.x, top: TODO.y, width: TODO.w }}
      >
        <div className="space-y-2">
          {[80, 65, 45].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500 shrink-0" />
              <span className="h-1.5 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </MiniCard>

      {/* 2. Card Tracker (Oranye) */}
      <MiniCard
        title="Tracker"
        icon={BarChart2}
        headerBg="bg-orange-500"
        pill="Lihat"
        pillBg="bg-orange-400/80"
        footer="+ Buat"
        footerBg="bg-orange-500"
        className="absolute"
        style={{ left: TRACKER.x, top: TRACKER.y, width: TRACKER.w }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-orange-500 shrink-0" />
            <span className="h-1.5 w-3/4 rounded-full bg-orange-100" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-orange-500 shrink-0" />
            <span className="h-1.5 w-1/2 rounded-full bg-orange-100" />
          </div>
        </div>
      </MiniCard>

      {/* 3. Card Deadlines (Kuning / Amber) */}
      <MiniCard
        title="Deadlines"
        icon={Calendar}
        headerBg="bg-amber-500"
        pill="Mandiri"
        pillBg="bg-amber-400/80"
        footer="Detail"
        footerBg="bg-slate-700"
        className="absolute"
        style={{ left: DEADLINES.x, top: DEADLINES.y, width: DEADLINES.w }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 shrink-0" />
            <span className="h-1.5 w-4/5 rounded-full bg-amber-100" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 shrink-0" />
            <span className="h-1.5 w-2/3 rounded-full bg-amber-100" />
          </div>
        </div>
      </MiniCard>

      {/* 4. Group Card TA 1 (Ungu) */}
      <div
        className="absolute z-10 overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] border border-slate-100/90"
        style={{ left: GROUP1.x, top: GROUP1.y, width: GROUP1.w }}
      >
        <div className="flex items-center gap-1.5 bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white">
          <Users className="size-3.5 shrink-0" />
          <span>Kelompok TA</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {[
            { initial: "A", name: "Asri", bg: "bg-blue-500" },
            { initial: "B", name: "Budi", bg: "bg-orange-500" },
            { initial: "C", name: "Clara", bg: "bg-emerald-500" },
            { initial: "D", name: "Dika", bg: "bg-purple-600" },
          ].map((m) => (
            <div key={m.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ${m.bg}`}
                >
                  {m.initial}
                </span>
                <span className="text-[12px] font-medium text-slate-700">{m.name}</span>
              </div>
              <GripVertical className="size-3 text-slate-300" />
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm"
        style={{ left: PILL1.x, top: PILL1.y }}
      >
        + User2
      </div>

      {/* 5. Group Card TA 2 (Slate/Navy) */}
      <div
        className="absolute z-10 overflow-hidden rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] border border-slate-100/90"
        style={{ left: GROUP2.x, top: GROUP2.y, width: GROUP2.w }}
      >
        <div className="flex items-center gap-1.5 bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white">
          <User className="size-3.5 shrink-0" />
          <span>Kelompok TA</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-xs">
                U
              </span>
              <span className="text-[12px] font-medium text-slate-700">user2</span>
            </div>
            <GripVertical className="size-3 text-slate-300" />
          </div>
        </div>
      </div>
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm"
        style={{ left: PILL2.x, top: PILL2.y }}
      >
        + User2
      </div>
    </div>
  );
}