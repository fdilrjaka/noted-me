import { CalendarClock, Clock, ExternalLink, MapPin, Radio, Laptop, School, Trash2 } from "lucide-react";
import type { ScheduleClass } from "@/components/schedule/scheduleData";

const STATUS_CONFIG = {
  ongoing: { label: "Ongoing", class: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  done: { label: "Done", class: "bg-slate-500/15 text-slate-400" },
  upcoming: { label: "Upcoming", class: "bg-blue-500/15 text-blue-400" },
};

export function ClassCard({ 
  item, 
  onDelete 
}: { 
  item: ScheduleClass; 
  onDelete: (id: string) => void;
}) {
  return (
    <div className="glass-card relative rounded-3xl p-4 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
            {/* Status di sebelah kanan lokasi */}
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[item.status].class}`}>
              {STATUS_CONFIG[item.status].label}
            </span>
          </div>
        </div>

        {/* Badge Tipe Kelas (Pojok Kanan Atas) */}
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              item.classType === "online" 
                ? "bg-rose-500/15 text-rose-400" 
                : "bg-indigo-500/15 text-indigo-400"
            }`}
          >
            {item.classType === "online" ? (
              <>
                <Radio className="size-3 animate-pulse text-rose-400" />
                Online Class
              </>
            ) : (
              <>
                <School className="size-3" />
                Offline Class
              </>
            )}
          </span>

          <button
            onClick={() => onDelete(item.id)}
            className="text-muted-foreground hover:text-destructive p-1 rounded-lg"
            title="Hapus Jadwal"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {item.deadline && (
        <div className="glass-input mt-3 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 flex-none" />
          <span className="truncate">{item.deadline}</span>
        </div>
      )}

      {item.lmsLinks && item.lmsLinks.map((lms, idx) => (
        <a
          key={idx}
          href={lms.url}
          target="_blank"
          rel="noopener noreferrer"
          className="press-sm mt-3 flex w-full items-center justify-between rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
        >
          <span>Ke LMS: {lms.label}</span>
          <ExternalLink className="size-3.5" />
        </a>
      ))}
    </div>
  );
}
