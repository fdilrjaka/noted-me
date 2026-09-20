import { Clock, MapPin, ExternalLink, Radio, Trash2, User, Pencil } from "lucide-react";
import type { ScheduleClass } from "@/components/schedule/scheduleData";

const STATUS_CONFIG = {
  ongoing: { label: "Ongoing", color: "bg-emerald-500", text: "text-emerald-400" },
  done: { label: "Done", color: "bg-slate-400", text: "text-slate-400" },
  upcoming: { label: "Upcoming", color: "bg-emerald-400", text: "text-emerald-400" },
};

export function ClassCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ScheduleClass;
  onEdit: (item: ScheduleClass) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="glass-soft relative rounded-2xl p-4 transition-all">
      {/* Header Card */}
      <div className="flex items-start justify-between gap-3 pb-3">
        <h3 className="truncate text-base font-bold text-foreground">{item.courseName}</h3>

        <div className="flex items-center gap-1.5">
          {/* Badge Tipe Kelas */}
          <span className="glass-soft flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {item.classType === "online" ? (
              <>
                <Radio className="size-3.5 text-rose-400 animate-pulse" />
                <span>Online Class</span>
              </>
            ) : (
              <>
                <User className="size-3.5 text-muted-foreground" />
                <span>Offline Class</span>
              </>
            )}
          </span>

          {/* Tombol Edit */}
          <button
            onClick={() => onEdit(item)}
            className="press flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit Jadwal"
          >
            <Pencil className="size-3.5" />
          </button>

          {/* Tombol Hapus */}
          <button
            onClick={() => onDelete(item.id)}
            className="press flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Hapus Jadwal"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Informasi Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 pb-2">
        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            TIME
          </span>
          <div className="flex items-center gap-1 mt-1 font-medium text-foreground">
            <Clock className="size-3.5 text-muted-foreground flex-none" />
            <span>{item.time}</span>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            LOKASI
          </span>
          <div className="flex items-center gap-1 mt-1 font-medium text-foreground">
            <MapPin className="size-3.5 text-muted-foreground flex-none" />
            <span className="truncate">{item.room}</span>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            STATUS
          </span>
          <div className="flex items-center gap-1.5 mt-1 font-medium">
            <span
              className={`size-2 rounded-full ${STATUS_CONFIG[item.status]?.color || "bg-slate-400"}`}
            />
            <span className={STATUS_CONFIG[item.status]?.text || "text-foreground"}>
              {STATUS_CONFIG[item.status]?.label || item.status}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Dosen
          </span>
          <div className="flex items-center gap-1.5 mt-1 font-medium text-foreground">
            <div className="glass-soft flex size-5 flex-none items-center justify-center rounded-full">
              <User className="size-3 text-muted-foreground" />
            </div>
            <span className="truncate">{item.lecturer || "-"}</span>
          </div>
        </div>
      </div>

      {/* Button LMS Link */}
      {item.lmsLinks &&
        item.lmsLinks.map((lms, idx) => (
          <div
            key={idx}
            className="glass-soft mt-3 flex items-center justify-between rounded-xl p-1.5 pl-3"
          >
            <a
              href={lms.url}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground active:scale-95"
            >
              <span>BUKA LMS: {lms.label}</span>
              <ExternalLink className="size-3.5" />
            </a>
            <span className="text-[11px] text-muted-foreground pr-2 hidden sm:inline-block">
              LMS Access to {lms.label}
            </span>
          </div>
        ))}
    </div>
  );
}
