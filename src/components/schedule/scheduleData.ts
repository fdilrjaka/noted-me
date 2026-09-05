import type { ScheduleDayId } from "@/components/schedule/DayTabs";

export type ClassType = "online" | "offline";
export type ClassStatus = "ongoing" | "done" | "upcoming";

export interface LmsLinkItem {
  label: string;
  url: string;
}

export interface ScheduleClass {
  id: string;
  day: ScheduleDayId;
  courseName: string;
  time: string;
  room: string;
  classType: ClassType;
  status: ClassStatus;
  lmsLinks: LmsLinkItem[];
  deadline?: string | null;
}

export const SAMPLE_CLASSES: ScheduleClass[] = [
  {
    id: "1",
    day: "senin",
    courseName: "Analisis Bisnis Digital",
    time: "08.00 - 09.40",
    room: "FEB 2.3",
    status: "selesai",
    lmsLinks: [
      { label: "LMS Parahaan", url: "https://lms.unpad.ac.id" },
      { label: "LMS Astra", url: "https://lms.unpad.ac.id" }
    ],
    deadline: null,
  },
  {
    id: "2",
    day: "senin",
    courseName: "Statistika Bisnis",
    time: "10.00 - 11.40",
    room: "Zoom Meeting",
    status: "live",
    lmsLinks: [
      { label: "LMS Statistika", url: "https://lms.unpad.ac.id" }
    ],
    deadline: "Kuis 2 — hari ini, 23.59",
  },
  {
    id: "3",
    day: "selasa",
    courseName: "UX Research",
    time: "13.00 - 15.30",
    room: "FEB 1.1",
    status: "akan-datang",
    lmsLinks: [
      { label: "LMS UX", url: "https://lms.unpad.ac.id" }
    ],
    deadline: "Laporan Riset — 15 Sep, 23.59",
  },
];
