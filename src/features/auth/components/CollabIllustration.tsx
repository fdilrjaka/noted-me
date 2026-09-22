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
    <div className={`pointer-events-none absolute flex items-start gap-1.5 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 size-5 flex-none drop-shadow-sm"
        style={{ transform: `rotate(${rotate}deg)` }}
        fill={color}
      >
        <path d="M4 2l14 6.2-5.8 1.7-1.3 5.9L4 2z" />
      </svg>
      <span
        className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
}

/** Tumpukan avatar bulat kecil (anggota kelompok), warna diturunkan dari inisial. */
function AvatarStack({ names }: { names: string[] }) {
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#0ea5e9", "#ec4899"];
  return (
    <div className="flex -space-x-2">
      {names.map((n, i) => (
        <span
          key={n + i}
          className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white shadow-sm"
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
      className={`w-48 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_8px_24px_-8px_rgba(30,41,59,0.25)] backdrop-blur-sm ${className}`}
      style={
        accent
          ? { borderTop: `3px solid ${accent}`, borderTopLeftRadius: 16, borderTopRightRadius: 16 }
          : undefined
      }
    >
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2.5 flex-none rounded-[3px] border border-slate-300" />
            <span
              className="h-1.5 rounded-full bg-slate-200"
              style={{ width: `${70 - i * 12}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupCard({ members, className = "" }: { members: string[]; className?: string }) {
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#0ea5e9", "#ec4899"];
  return (
    <div
      className={`w-48 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_8px_24px_-8px_rgba(30,41,59,0.25)] backdrop-blur-sm ${className}`}
    >
      <p className="text-sm font-semibold text-slate-700">Kelompok TA</p>
      <div className="mt-2.5 flex flex-col gap-2">
        {members.map((m, i) => (
          <div key={m + i} className="flex items-center gap-2">
            <span
              className="flex size-5 flex-none items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: colors[i % colors.length] }}
            >
              {m[0]?.toUpperCase()}
            </span>
            <span className="text-xs text-slate-600">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Ilustrasi statis (tanpa animasi berat) yang menggambarkan beberapa orang sedang bareng-bareng
 * menyusun dashboard: kartu To-Do/Tracker/Deadline dengan panah alur, kursor warna-warni dengan
 * nama, dan kartu "Kelompok TA" berisi avatar anggota. Hanya tampil di layar lebar (lg+) supaya
 * halaman login tetap ringkas & rapi di HP.
 */
export function CollabIllustration() {
  return (
    <div className="relative hidden h-[34rem] w-full max-w-xl lg:block" aria-hidden="true">
      <svg className="absolute inset-0 size-full" viewBox="0 0 560 560" fill="none">
        <path
          d="M40 300 C 110 300, 110 120, 190 120"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M40 300 C 110 300, 110 300, 190 300"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M40 300 C 110 300, 110 470, 190 470"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
        />
        <path d="M190 150 V 270" stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path
          d="M330 150 C 380 150, 380 150, 420 150"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M330 300 C 380 300, 380 400, 420 400"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
        />
        <path d="M420 380 V 300" stroke="#94a3b8" strokeWidth="2" fill="none" />
      </svg>

      <MiniCard title="To-Do List" accent="#2563eb" className="absolute left-[190px] top-[100px]" />
      <Cursor
        color={CURSOR_COLORS.blue}
        label="Adit"
        rotate={-25}
        className="left-[300px] top-[190px]"
      />

      <MiniCard
        title="Tracker"
        accent="#ea580c"
        lines={2}
        className="absolute left-[190px] top-[255px]"
      />
      <Cursor
        color={CURSOR_COLORS.orange}
        label="Budi"
        rotate={0}
        className="left-[300px] top-[345px]"
      />
      <Cursor
        color={CURSOR_COLORS.green}
        label="Clara"
        rotate={20}
        className="left-[150px] top-[380px]"
      />

      <MiniCard
        title="Deadline"
        accent="#f59e0b"
        lines={2}
        className="absolute left-[190px] top-[430px]"
      />
      <Cursor
        color={CURSOR_COLORS.slate}
        label="Doni"
        rotate={35}
        className="left-[300px] top-[500px]"
      />

      <GroupCard
        members={["Adit", "Budi", "Clara", "user2"]}
        className="absolute left-[420px] top-[70px]"
      />
      <div className="absolute left-[440px] top-[190px]">
        <AvatarStack names={["A", "B", "C"]} />
      </div>

      <GroupCard members={["user2"]} className="absolute left-[420px] top-[330px]" />
      <Cursor
        color={CURSOR_COLORS.purple}
        label="user2"
        rotate={-10}
        className="left-[420px] top-[440px]"
      />
    </div>
  );
}
