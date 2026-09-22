import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SCHEDULE_DAYS, type ScheduleDayId } from "@/components/schedule/DayTabs";
import { classesForDay, createClass, useScheduleData } from "@/lib/noteme/scheduleStore";
import type { ScheduleCanvasNode } from "@/lib/noteme/canvasStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";

const MAX_ROWS = 7;
const TODAY_IDS: (ScheduleDayId | null)[] = [
  null,
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  null,
];

/** Node Live: seluruh jadwal kuliah dari halaman Jadwal, hari ini ditaruh paling atas. */
export function ScheduleNodeView({
  node,
  selected,
  onSize,
}: {
  node: ScheduleCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const data = useScheduleData();
  const color = PALETTE[node.color].solid;
  const today = TODAY_IDS[new Date().getDay()] ?? null;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState<ScheduleDayId>(today ?? "senin");
  const [time, setTime] = useState("");

  const rows = useMemo(
    () =>
      SCHEDULE_DAYS.flatMap((d) => classesForDay(data, d.id).map((c) => ({ day: d, c }))).sort(
        (a, b) => Number(b.day.id === today) - Number(a.day.id === today),
      ),
    [data, today],
  );

  const save = () => {
    if (!name.trim()) return;
    // Kelas baru langsung tersimpan di halaman Jadwal.
    createClass({
      day,
      courseName: name,
      time,
      room: "",
      classType: "offline",
      status: "upcoming",
      lmsLinks: [],
    });
    setName("");
    setTime("");
    setAdding(false);
  };

  const field =
    "rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground dark:bg-slate-800";

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="live">
      <ul className="flex flex-col gap-1">
        {rows.slice(0, MAX_ROWS).map(({ day: d, c }) => (
          <li
            key={c.id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${
              d.id === today ? "font-medium" : "bg-slate-100 dark:bg-slate-800"
            }`}
            style={d.id === today ? { backgroundColor: `${color}22` } : undefined}
          >
            <span className="w-9 flex-none text-muted-foreground">{d.label.slice(0, 3)}</span>
            <span className="min-w-0 flex-1 truncate">{c.courseName}</span>
            <span className="flex-none tabular-nums text-muted-foreground">{c.time}</span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-xs text-muted-foreground">Belum ada jadwal kuliah.</li>
        )}
        {rows.length > MAX_ROWS && (
          <li className="text-xs text-muted-foreground">
            +{rows.length - MAX_ROWS} jadwal lainnya
          </li>
        )}
      </ul>

      {adding ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Nama mata kuliah"
            className={`w-full ${field}`}
          />
          <div className="flex gap-1.5">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as ScheduleDayId)}
              aria-label="Hari"
              className={`min-w-0 flex-1 ${field}`}
            >
              {SCHEDULE_DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Jam"
              className={`min-w-0 flex-1 ${field}`}
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-2 py-1 text-xs text-muted-foreground"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              Simpan
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-1 text-xs text-muted-foreground hover:bg-black/5 dark:border-white/20"
        >
          + Tambah kelas
        </button>
      )}
      <div className="mt-2 text-right text-[11px]">
        <Link to="/schedule" className="font-medium hover:underline" style={{ color }}>
          Buka Jadwal →
        </Link>
      </div>
    </NodeShell>
  );
}
