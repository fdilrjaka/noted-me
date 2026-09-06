import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, Search } from "lucide-react";
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
  const [activeDay, setActiveDay] = useState<ScheduleDayId>("jumat");
  const scheduleData = useScheduleData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [courseName, setCourseName] = useState("");
  const [lecturer, setLecturer] = useState(""); // State Nama Dosen
  const [day, setDay] = useState<ScheduleDayId>("jumat");
  const [time, setTime] = useState("");
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState<ClassType>("offline");
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
      lecturer: lecturer || "Dr. Andi Wijaya",
      time,
      room,
      classType,
      status,
      lmsLinks: lmsUrl ? [{ label: lmsLabel || "Live Unpad", url: lmsUrl }] : [],
    });
    setIsModalOpen(false);
    // Reset Form
    setCourseName(""); setLecturer(""); setTime(""); setRoom(""); setLmsLabel(""); setLmsUrl("");
  };

  const handleDelete = (id: string) => {
    deleteClass(id);
  };

  const filteredClasses = useMemo(
    () => classesForDay(scheduleData, activeDay),
    [scheduleData, activeDay]
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem] bg-[#121417] text-slate-200">
      <Sidebar />
      
      {/* Top Search Bar */}
      <div className="pt-4 pb-2">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-full bg-slate-800/50 py-2 pl-10 pr-4 text-xs border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
      </div>

      <ScheduleHeader />

      <div className="flex items-center justify-between my-4 gap-2">
        <DayTabs active={activeDay} onChange={setActiveDay} />
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Tambah Jadwal"
          className="flex size-9 flex-none items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-28">
        {filteredClasses.length === 0 && (
          <p className="px-1 py-12 text-center text-sm text-slate-500">
            Belum ada jadwal. Klik tombol <strong>+</strong> untuk menambahkan.
          </p>
        )}
        {filteredClasses.map((item) => (
          <ClassCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>

      {/* Pop-up Modal Input */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl bg-[#1a1d21] border border-slate-800 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">Tambah Jadwal Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Nama Mata Kuliah</label>
                <input
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="contoh: Pengembangan Produk"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Nama Dosen Pengampu</label>
                <input
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="contoh: Dr. Andi Wijaya"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 font-medium">Hari</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as ScheduleDayId)}
                    className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white focus:outline-none focus:border-slate-500"
                  >
                    {SCHEDULE_DAYS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-900 text-white">{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Jam Kuliah</label>
                  <input
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                    placeholder="07:00 - 09:30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 font-medium">Ruangan / Lokasi</label>
                  <input
                    required
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                    placeholder="LAMBDA 0715-0204"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Tipe Kelas</label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value as ClassType)}
                    className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white focus:outline-none focus:border-slate-500"
                  >
                    <option value="offline" className="bg-slate-900 text-white">Offline Class</option>
                    <option value="online" className="bg-slate-900 text-white">Online Class</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Status Pertemuan</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClassStatus)}
                  className="w-full rounded-xl bg-slate-800/80 p-2.5 mt-1 border border-slate-700/80 text-white focus:outline-none focus:border-slate-500"
                >
                  <option value="upcoming" className="bg-slate-900 text-white">Upcoming</option>
                  <option value="ongoing" className="bg-slate-900 text-white">Ongoing</option>
                  <option value="done" className="bg-slate-900 text-white">Done</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="text-xs font-semibold text-teal-400">Tautan LMS (Opsional)</label>
                <input
                  value={lmsLabel}
                  onChange={(e) => setLmsLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="Label (misal: Live Unpad)"
                />
                <input
                  value={lmsUrl}
                  onChange={(e) => setLmsUrl(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="URL (https://...)"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 rounded-xl bg-teal-500 p-3 font-bold text-slate-950 transition-all hover:bg-teal-400 active:scale-98"
              >
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
