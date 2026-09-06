import { Clock, MapPin, ExternalLink, Radio, School, Trash2, User } from "lucide-react";
import type { ScheduleClass } from "@/components/schedule/scheduleData";

const STATUS_CONFIG = {
  ongoing: { label: "Ongoing", color: "bg-emerald-500", text: "text-emerald-400" },
  done: { label: "Done", color: "bg-slate-400", text: "text-slate-400" },
  upcoming: { label: "Upcoming", color: "bg-emerald-400", text: "text-emerald-400" },
};

export function ClassCard({ 
  item, 
  onDelete 
}: { 
  item: ScheduleClass; 
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-[#1c1f24]/90 p-4 shadow-sm transition-all hover:border-slate-700">
      {/* Header: Judul Mata Kuliah & Action Badge */}
      <div className="flex items-start justify-between gap-3 pb-3">
        <h3 className="truncate text-base font-bold text-slate-100">{item.courseName}</h3>
        
        <div className="flex items-center gap-2">
          {/* Badge Tipe Kelas */}
          <span className="flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-700/50">
            {item.classType === "online" ? (
              <>
                <Radio className="size-3.5 text-rose-400 animate-pulse" />
                <span>Online Class</span>
              </>
            ) : (
              <>
                <User className="size-3.5 text-slate-400" />
                <span>Offline Class</span>
              </>
            )}
          </span>

          {/* Action Hapus */}
          <button
            onClick={() => onDelete(item.id)}
            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
            title="Hapus Jadwal"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Grid Informasi Detail (Jam, Lokasi, Status, Dosen) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 pb-2">
        {/* Waktu */}
        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">TIME</span>
          <div className="flex items-center gap-1 mt-1 font-medium text-slate-300">
            <Clock className="size-3.5 text-slate-400 flex-none" />
            <span>{item.time}</span>
          </div>
        </div>

        {/* Lokasi */}
        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">LOKASI</span>
          <div className="flex items-center gap-1 mt-1 font-medium text-slate-300">
            <MapPin className="size-3.5 text-slate-400 flex-none" />
            <span className="truncate">{item.room}</span>
          </div>
        </div>

        {/* Status */}
        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">STATUS</span>
          <div className="flex items-center gap-1.5 mt-1 font-medium">
            <span className={`size-2 rounded-full ${STATUS_CONFIG[item.status]?.color || 'bg-slate-400'}`} />
            <span className={STATUS_CONFIG[item.status]?.text || 'text-slate-300'}>
              {STATUS_CONFIG[item.status]?.label || item.status}
            </span>
          </div>
        </div>

        {/* Dosen (dengan icon profile standar, bukan muka) */}
        <div>
          <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Dosen</span>
          <div className="flex items-center gap-1.5 mt-1 font-medium text-slate-300">
            <div className="flex size-5 flex-none items-center justify-center rounded-full bg-slate-800 border border-slate-700">
              <User className="size-3 text-slate-400" />
            </div>
            <span className="truncate">{item.lecturer || "Dr. Andi Wijaya"}</span>
          </div>
        </div>
      </div>

      {/* Button LMS Link */}
      {item.lmsLinks && item.lmsLinks.map((lms, idx) => (
        <div key={idx} className="mt-3 flex items-center justify-between rounded-xl bg-slate-800/60 p-1.5 pl-3 border border-slate-700/40">
          <button
            onClick={() => window.open(lms.url, "_blank")}
            className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 transition-all hover:bg-white active:scale-95"
          >
            <span>BUKA LMS: {lms.label}</span>
            <ExternalLink className="size-3.5" />
          </button>
          <span className="text-[11px] text-slate-400 pr-2 hidden sm:inline-block">
            LMS Access to {lms.label}
          </span>
        </div>
      ))}
    </div>
  );
}
