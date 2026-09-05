import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { DayTabs, SCHEDULE_DAYS, type ScheduleDayId } from "@/components/schedule/DayTabs";
import { ClassCard } from "@/components/schedule/ClassCard";
import type { ClassType, ClassStatus } from "@/components/schedule/scheduleData";
import { classesForDay, createClass, deleteClass, loadScheduleLocal, useScheduleData } from "@/lib/noteme/scheduleStore";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const [activeDay, setActiveDay] = useState<ScheduleDayId>("senin");
  const scheduleData = useScheduleData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [courseName, setCourseName] = useState("");
  const [day, setDay] = useState<ScheduleDayId>("senin");
  const [time, setTime] = useState("");
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState<ClassType>("online");
  const [status, setStatus] = useState<ClassStatus>("upcoming");
  const [lmsLabel, setLmsLabel] = useState("");
  const [lmsUrl, setLmsUrl] = useState("");

  useEffect(() => {
    loadScheduleLocal();
  }, []);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    createClass({
      day,
      courseName,
      time,
      room,
      classType,
      status,
      lmsLinks: lmsUrl ? [{ label: lmsLabel || "LMS Mata Kuliah", url: lmsUrl }] : [],
    });
    setIsModalOpen(false);
    // Reset Form
    setCourseName(""); setTime(""); setRoom(""); setLmsLabel(""); setLmsUrl("");
  };

  const handleDelete = (id: string) => {
    deleteClass(id);
  };

  const filteredClasses = useMemo(
    () => classesForDay(scheduleData, activeDay),
    [scheduleData, activeDay]
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem]">
      <Sidebar />
      <ScheduleHeader />

      <div className="flex items-center justify-between my-4 gap-2">
        <DayTabs active={activeDay} onChange={setActiveDay} />
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Tambah Jadwal"
          className="press glass-fab flex size-10 flex-none items-center justify-center rounded-full text-foreground/95 active:scale-90"
        >
          <Plus className="glass-fab-icon size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-28">
        {filteredClasses.length === 0 && (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            Belum ada jadwal. Klik tombol <strong>+ Tambah Jadwal</strong> untuk menambahkan.
          </p>
        )}
        {filteredClasses.map((item) => (
          <ClassCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>

      {/* Pop-up Modal Input */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-lg font-bold">Tambah Jadwal Baru</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="size-5" /></button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground">Nama Mata Kuliah</label>
                <input required value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700" placeholder="contoh: UX Research" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Hari</label>
                  <select value={day} onChange={(e) => setDay(e.target.value as ScheduleDayId)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700">
                    {SCHEDULE_DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Jam</label>
                  <input required value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700" placeholder="08.00 - 09.40" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Ruangan</label>
                  <input required value={room} onChange={(e) => setRoom(e.target.value)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700" placeholder="FEB 1.1 / Zoom" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipe Kelas</label>
                  <select value={classType} onChange={(e) => setClassType(e.target.value as ClassType)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700">
                    <option value="online">Online Class</option>
                    <option value="offline">Offline Class</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Status Pertemuan</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ClassStatus)} className="w-full rounded-xl bg-slate-800 p-2.5 mt-1 border border-slate-700">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-primary">Tautan LMS (Opsional)</label>
                <input value={lmsLabel} onChange={(e) => setLmsLabel(e.target.value)} className="w-full rounded-xl bg-slate-800 p-2.5 border border-slate-700" placeholder="Label (misal: LMS Parahaan)" />
                <input value={lmsUrl} onChange={(e) => setLmsUrl(e.target.value)} className="w-full rounded-xl bg-slate-800 p-2.5 border border-slate-700" placeholder="URL (https://...)" />
              </div>

              <button type="submit" className="w-full mt-4 rounded-full bg-primary p-3 font-semibold text-primary-foreground">
                Simpan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
