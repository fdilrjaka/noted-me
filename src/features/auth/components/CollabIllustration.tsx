import React from "react";
import { CheckSquare, BarChart2, Calendar, Users, User, GripVertical } from "lucide-react";

/**
 * Kartu mini bergaya node kanvas NoteMe.
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
      className={`overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_-4px_rgba(0,0,0,0.06)] border border-slate-200/80 z-10 transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      style={style}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white ${headerBg}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span>{title}</span>
        </div>
        {pill && (
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wide ${pillBg} ${pillText}`}
          >
            {pill}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        {children}
        {footer && (
          <div className="mt-0.5 flex justify-end">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-2xs ${
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

/**
 * Komponen live cursor kolaboratif bergaya Figma/Miro.
 */
function LiveCursor({
  x,
  y,
  name,
  color,
  className = "",
}: {
  x: number;
  y: number;
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute pointer-events-none z-30 flex items-start select-none transition-transform duration-300 ${className}`}
      style={{ left: x, top: y }}
    >
      <svg
        className="size-4.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
        viewBox="0 0 24 24"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      >
        <path d="M5.5 3.2L18.8 12.3C19.7 12.9 19.3 14.3 18.2 14.4L13.1 14.8L16.2 21.2C16.6 22 15.7 22.8 14.9 22.4L11.8 16.7L8.6 20.3C7.9 21.1 6.6 20.6 6.6 19.5L5.5 3.2Z" />
      </svg>
      <span
        className="ml-1 -mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}

const VIEW_W = 660;
const VIEW_H = 480;

// Posisi & dimensi node-node kanvas
const CATATAN = { x: 28, y: 220, w: 72, h: 28 };
const TODO = { x: 136, y: 32, w: 184, h: 140 };
const TRACKER = { x: 136, y: 198, w: 184, h: 128 };
const DEADLINES = { x: 136, y: 348, w: 184, h: 120 };

const GROUP1 = { x: 388, y: 22, w: 184, h: 180 };
const GROUP2 = { x: 388, y: 272, w: 184, h: 108 };

const PILL1 = { x: 445, y: GROUP1.y + GROUP1.h + 16, w: 70, h: 26 };
const PILL2 = { x: 445, y: GROUP2.y + GROUP2.h + 16, w: 70, h: 26 };

function rightMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x + b.w, y: b.y + b.h / 2 };
}
function leftMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x, y: b.y + b.h / 2 };
}
function bottomMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x + b.w / 2, y: b.y + b.h };
}
function topMid(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x + b.w / 2, y: b.y };
}

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }, curviness = 0.5) {
  const dx = (to.x - from.x) * curviness;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

function ConnectorDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="4.5" fill="white" />
      <circle cx={x} cy={y} r="4.5" fill="none" stroke={color} strokeWidth="1.75" />
      <circle cx={x} cy={y} r="1.75" fill={color} />
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

  const group1Bottom = bottomMid(GROUP1);
  const pill1Top = topMid(PILL1);

  const group2Bottom = bottomMid(GROUP2);
  const pill2Top = topMid(PILL2);

  // Jalur konektor yang terhubung sempurna tanpa celah:
  // 1. Dari Catatan ke Tracker
  const catatanToTracker = curvePath(catatanRight, trackerLeft, 0.45);
  // 2. Dari To-Do List langsung menyambung ke Kelompok TA (top)
  const todoToGroup1 = curvePath(todoRight, group1Left, 0.45);
  // 3. Dari Tracker & Deadlines langsung menyambung ke Kelompok TA 2 (dark)
  const trackerToGroup2 = curvePath(trackerRight, group2Left, 0.45);
  const deadlinesToGroup2 = curvePath(deadlinesRight, group2Left, 0.45);
  // 4. Dari Kelompok TA langsung menyambung ke kartu form login di kanan
  const group1ToAuth = curvePath(group1Right, { x: VIEW_W + 4, y: 92 }, 0.5);

  const BLUE = "#3b82f6";
  const ORANGE = "#f97316";
  const PURPLE = "#8b5cf6";
  const EMERALD = "#10b981";

  return (
    <div
      className="relative hidden w-full max-w-2xl lg:block select-none pointer-events-none"
      style={{ height: VIEW_H }}
      aria-hidden="true"
    >
      {/* Kabel-kabel konektor kanvas yang tersambung penuh dan presisi */}
      <svg
        className="absolute inset-0 size-full overflow-visible pointer-events-none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="none"
      >
        <defs>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* 1. Kabel Catatan ke Tracker */}
        <path d={catatanToTracker} stroke={ORANGE} strokeWidth="1.75" strokeLinecap="round" />

        {/* 2. Kabel To-Do ke Kelompok TA 1 */}
        <path d={todoToGroup1} stroke={BLUE} strokeWidth="1.75" strokeLinecap="round" />

        {/* 3. Kabel Tracker ke Kelompok TA 2 */}
        <path d={trackerToGroup2} stroke={ORANGE} strokeWidth="1.75" strokeLinecap="round" />

        {/* 4. Kabel Deadlines ke Kelompok TA 2 */}
        <path d={deadlinesToGroup2} stroke={ORANGE} strokeWidth="1.75" strokeLinecap="round" />

        {/* 5. Kabel vertikal dari Group1 ke + User2 (tersambung rapat) */}
        <line
          x1={group1Bottom.x}
          y1={group1Bottom.y}
          x2={pill1Top.x}
          y2={pill1Top.y}
          stroke={PURPLE}
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* 6. Kabel vertikal dari Group2 ke + User2 (tersambung rapat) */}
        <line
          x1={group2Bottom.x}
          y1={group2Bottom.y}
          x2={pill2Top.x}
          y2={pill2Top.y}
          stroke={PURPLE}
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* 7. Kabel utama dari Kelompok TA yang mengalir dan tersambung ke kotak login */}
        <path
          d={group1ToAuth}
          stroke="url(#purpleGradient)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Port konektor di setiap titik temu agar tidak terputus */}
        <ConnectorDot x={catatanRight.x} y={catatanRight.y} color={ORANGE} />
        <ConnectorDot x={trackerLeft.x} y={trackerLeft.y} color={ORANGE} />
        <ConnectorDot x={trackerRight.x} y={trackerRight.y} color={ORANGE} />
        <ConnectorDot x={todoRight.x} y={todoRight.y} color={BLUE} />
        <ConnectorDot x={group1Left.x} y={group1Left.y} color={BLUE} />
        <ConnectorDot x={deadlinesRight.x} y={deadlinesRight.y} color={ORANGE} />
        <ConnectorDot x={group2Left.x} y={group2Left.y} color={ORANGE} />
        <ConnectorDot x={group1Bottom.x} y={group1Bottom.y} color={PURPLE} />
        <ConnectorDot x={pill1Top.x} y={pill1Top.y} color={PURPLE} />
        <ConnectorDot x={group2Bottom.x} y={group2Bottom.y} color={PURPLE} />
        <ConnectorDot x={pill2Top.x} y={pill2Top.y} color={PURPLE} />
        <ConnectorDot x={group1Right.x} y={group1Right.y} color={PURPLE} />
      </svg>

      {/* Live Multiplayer Cursors */}
      <LiveCursor
        x={280}
        y={48}
        name="Fadhil"
        color={EMERALD}
        className="animate-pulse"
      />
      <LiveCursor
        x={500}
        y={140}
        name="Sarah"
        color={PURPLE}
      />
      <LiveCursor
        x={240}
        y={280}
        name="Budi"
        color={ORANGE}
      />

      {/* 0. Pill Mini "Catatan" di sisi kiri */}
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-2xs"
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
              <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="h-1.5 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
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
            <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
            <span className="h-1.5 w-3/4 rounded-full bg-orange-100" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
            <span className="h-1.5 w-1/2 rounded-full bg-orange-100" />
          </div>
        </div>
      </MiniCard>

      {/* 3. Card Deadlines (Amber) */}
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
            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="h-1.5 w-4/5 rounded-full bg-amber-100" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="h-1.5 w-2/3 rounded-full bg-amber-100" />
          </div>
        </div>
      </MiniCard>

      {/* 4. Group Card TA 1 (Indigo) */}
      <div
        className="absolute z-10 overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_-4px_rgba(0,0,0,0.06)] border border-slate-200/80"
        style={{ left: GROUP1.x, top: GROUP1.y, width: GROUP1.w }}
      >
        <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white">
          <Users className="size-3.5 shrink-0" />
          <span>Kelompok TA</span>
        </div>
        <div className="flex flex-col gap-1.5 p-2.5">
          {[
            { initial: "A", name: "Asri", bg: "bg-blue-500" },
            { initial: "B", name: "Budi", bg: "bg-orange-500" },
            { initial: "C", name: "Clara", bg: "bg-emerald-500" },
            { initial: "D", name: "Dika", bg: "bg-indigo-600" },
          ].map((m) => (
            <div key={m.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-2xs ${m.bg}`}
                >
                  {m.initial}
                </span>
                <span className="text-[11.5px] font-medium text-slate-700">{m.name}</span>
              </div>
              <GripVertical className="size-3 text-slate-300" />
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-2xs"
        style={{ left: PILL1.x, top: PILL1.y, width: PILL1.w, height: PILL1.h }}
      >
        + User2
      </div>

      {/* 5. Group Card TA 2 (Slate/Dark) */}
      <div
        className="absolute z-10 overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_-4px_rgba(0,0,0,0.06)] border border-slate-200/80"
        style={{ left: GROUP2.x, top: GROUP2.y, width: GROUP2.w }}
      >
        <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white">
          <User className="size-3.5 shrink-0" />
          <span>Kelompok TA</span>
        </div>
        <div className="flex flex-col gap-1.5 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-4.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white shadow-2xs">
                U
              </span>
              <span className="text-[11.5px] font-medium text-slate-700">user2</span>
            </div>
            <GripVertical className="size-3 text-slate-300" />
          </div>
        </div>
      </div>
      <div
        className="absolute z-10 flex items-center justify-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-2xs"
        style={{ left: PILL2.x, top: PILL2.y, width: PILL2.w, height: PILL2.h }}
      >
        + User2
      </div>
    </div>
  );
}