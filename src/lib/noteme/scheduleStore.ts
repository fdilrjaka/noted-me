import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ScheduleDayId } from "@/components/schedule/DayTabs";
import type { ClassType, ClassStatus, LmsLinkItem } from "@/components/schedule/scheduleData";

export type ScheduleClassRow = {
  id: string;
  day: ScheduleDayId;
  courseName: string;
  lecturer?: string;
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
    toast.error("Gagal menyimpan perubahan Jadwal ke penyimpanan lokal.");
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function update(fn: (prev: ScheduleData) => ScheduleData) {
  data = fn(data);
  persist();
  notify();
}

export function loadScheduleLocal() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch {
    data = EMPTY;
  }
  notify();
}

export function getScheduleData() {
  return data;
}

export function setScheduleData(next: ScheduleData) {
  data = next;
  persist();
  notify();
}

export function useScheduleData() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getScheduleData,
    () => EMPTY,
  );
}

export function classesForDay(d: ScheduleData, day: ScheduleDayId) {
  return d.classes.filter((c) => c.day === day && !c.deleted).sort((a, b) => a.position - b.position);
}

export function dirtyScheduleCount(d: ScheduleData): number {
  return d.classes.filter((c) => c.dirty).length;
}

export function createClass(input: {
  day: ScheduleDayId;
  courseName: string;
  lecturer?: string;
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
    lecturer: input.lecturer?.trim() || "Dr. Andi Wijaya",
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
}

export function updateClass(
  id: string,
  input: Partial<Omit<ScheduleClassRow, "id" | "position" | "deleted" | "updated_at" | "dirty">>
) {
  update((d) => ({
    ...d,
    classes: d.classes.map((c) =>
      c.id === id
        ? {
            ...c,
            ...input,
            updated_at: now(),
            dirty: true,
          }
        : c
    ),
  }));
}

export function deleteClass(id: string) {
  update((d) => ({
    ...d,
    classes: d.classes.map((c) => (c.id === id ? { ...c, deleted: true, updated_at: now(), dirty: true } : c)),
  }));
}
