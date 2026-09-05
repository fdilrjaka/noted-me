import type { ScheduleDayId } from "@/components/schedule/DayTabs";

export type ClassStatus = "selesai" | "live" | "akan-datang";

export interface ScheduleClass {
  id: string;
  day: ScheduleDayId;
  courseName: string;
  time: string; // contoh: "08.00 - 09.40"
  room: string;
  status: ClassStatus;
  lmsUrl: string | null;
  deadline: string | null; // contoh: "Tugas 3 — 12 Sep, 23.59"
}

export const SAMPLE_CLASSES: ScheduleClass[] = [
  {
    id: "1",
    day: "senin",
    courseName: "Analisis Bisnis Digital",
    time: "08.00 - 09.40",
    room: "FEB 2.3",
    status: "selesai",
    lmsUrl: "https://lms.unpad.ac.id",
    deadline: null,
  },
  {
    id: "2",
    day: "senin",
    courseName: "Statistika Bisnis",
    time: "10.00 - 11.40",
    room: "Zoom Meeting",
    status: "live",
    lmsUrl: "https://lms.unpad.ac.id",
    deadline: "Kuis 2 — hari ini, 23.59",
  },
  {
    id: "3",
    day: "selasa",
    courseName: "UX Research",
    time: "13.00 - 15.30",
    room: "FEB 1.1",
    status: "akan-datang",
    lmsUrl: "https://lms.unpad.ac.id",
    deadline: "Laporan Riset — 15 Sep, 23.59",
  },
];
