import { CalendarClock, Clock, ExternalLink, MapPin, Radio } from "lucide-react";
import type { ClassStatus, ScheduleClass } from "@/components/schedule/scheduleData";

const STATUS_LABEL: Record<ClassStatus, string> = {
  selesai: "Selesai",
  live: "Live Class",
  "akan-datang": "Akan Datang",
};

const STATUS_CLASS: Record<ClassStatus, string> = {
  selesai: "bg-input text-muted-foreground",
  live: "bg-destructive/15 text-destructive",
  "akan-datang": "bg-primary/15 text-primary",
};

export function ClassCard({ item }: { item: ScheduleClass }) {
  return (
    <div className="glass-card rounded-3xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{item.courseName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {item.time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {item.room}
            </span>
          </div>
        </div>

        <span
          className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[item.status]}`}
        >
          {item.status === "live" && <Radio className="mr-1 inline size-3 animate-pulse" />}
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.deadline && (
        <div className="glass-input mt-3 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 flex-none" />
          <span className="truncate">{item.deadline}</span>
        </div>
      )}

      {item.lmsUrl && (
        <a
          href={item.lmsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="press-sm mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
        >
          Buka LMS
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}
