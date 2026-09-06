export type ClassType = "online" | "offline";
export type ClassStatus = "upcoming" | "ongoing" | "done";

export interface LmsLink {
  label: string;
  url: string;
}

export interface ScheduleClass {
  id: string;
  day: string;
  courseName: string;
  time: string;
  room: string;
  classType: ClassType;
  status: ClassStatus;
  lecturer?: string; // Menambahkan field Dosen
  deadline?: string;
  lmsLinks?: LmsLink[];
}
