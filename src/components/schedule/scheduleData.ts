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
  lecturer?: string;
  time: string;
  room: string;
  classType: ClassType;
  status: ClassStatus;
  lmsLinks: LmsLinkItem[];
  deadline?: string | null;
}
