import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ScheduleDayId } from "@/components/schedule/DayTabs";
import type { ClassType, ClassStatus, LmsLinkItem } from "@/components/schedule/scheduleData";

export type ScheduleClassRow = {
  id: string;
  day: ScheduleDayId;
  courseName: string;
  time: string;
  room: string;
  classType: ClassType;
  status: ClassStatus;
  lmsLinks: LmsLinkItem[];
  deadline: string | null;
  position: number;
  deleted: boolean;
  updated_at: string;
  dirty: boolean;
};

export type ScheduleData = {
  classes: ScheduleClassRow[];
  lastPull: string | null;
};

const KEY = "noteme.schedule.v1";
const LEGACY_KEY = "schedule_data";
const EMPTY: ScheduleData = { classes: [], lastPull: null };

let data: ScheduleData = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    toast.error("Gagal menyimpan perubahan Jadwal ke penyimpanan lokal perangkat ini.");
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** Migrasi satu kali dari format lama (localStorage polos, tanpa id sync-aware
 *  atau tanda dirty) supaya jadwal yang sudah dibuat sebelumnya tidak hilang. */
function migrateLegacy(): ScheduleData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      day: ScheduleDayId;
      courseName: string;
      time: string;
      room: string;
      classType: ClassType;
      status: ClassStatus;
      lmsLinks: LmsLinkItem[];
      deadline?: string | null;
    }>;
    const ts = now();
    const classes: ScheduleClassRow[] = parsed.map((c, i) => ({
      id: c.id || uid(),
      day: c.day,
      courseName: c.courseName ?? "",
      time: c.time ?? "",
      room: c.room ?? "",
      classType: c.classType ?? "online",
      status: c.status ?? "upcoming",
      lmsLinks: c.lmsLinks ?? [],
      deadline: c.deadline ?? null,
      position: i,
      deleted: false,
      updated_at: ts,
      dirty: true,
    }));
    window.localStorage.removeItem(LEGACY_KEY);
    return { classes, lastPull: null };
  } catch {
    return null;
  }
}

export function loadScheduleLocal() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ScheduleData;
      data = { classes: parsed.classes ?? [], lastPull: parsed.lastPull ?? null };
    } else {
      const migrated = migrateLegacy();
      if (migrated) data = migrated;
    }
  } catch {
    data = EMPTY;
  }
  persist();
  emit();
}

export function setScheduleData(next: ScheduleData) {
  data = next;
  persist();
  emit();
}

export function getScheduleData() {
  return data;
}

function update(fn: (d: ScheduleData) => ScheduleData) {
  setScheduleData(fn(data));
}

export function useScheduleData(): ScheduleData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => EMPTY,
  );
}

/* ---------------- selectors ---------------- */

export function classesForDay(d: ScheduleData, day: ScheduleDayId) {
  return d.classes.filter((c) => c.day === day && !c.deleted).sort((a, b) => a.position - b.position);
}

export function dirtyScheduleCount() {
  return data.classes.filter((c) => c.dirty).length;
}

/* ---------------- mutations ---------------- */

export function createClass(input: {
  day: ScheduleDayId;
  courseName: string;
  time: string;
  room: string;
  classType: ClassType;
  status: ClassStatus;
  lmsLinks: LmsLinkItem[];
  deadline?: string | null;
}) {
  const id = uid();
  const siblings = data.classes.filter((c) => c.day === input.day && !c.deleted);
  const row: ScheduleClassRow = {
    id,
    day: input.day,
    courseName: input.courseName.trim(),
    time: input.time,
    room: input.room,
    classType: input.classType,
    status: input.status,
    lmsLinks: input.lmsLinks,
    deadline: input.deadline ?? null,
    position: siblings.reduce((max, c) => Math.max(max, c.position), 0) + 1,
    deleted: false,
    updated_at: now(),
    dirty: true,
  };
  update((d) => ({ ...d, classes: [...d.classes, row] }));
  return id;
}

export function deleteClass(id: string) {
  update((d) => ({
    ...d,
    classes: d.classes.map((c) => (c.id === id ? { ...c, deleted: true, updated_at: now(), dirty: true } : c)),
  }));
}

export function clearScheduleLocal() {
  setScheduleData({ classes: [], lastPull: null });
}
