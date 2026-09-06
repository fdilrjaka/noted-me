import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, Search } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { DayTabs, SCHEDULE_DAYS, type ScheduleDayId } from "@/components/schedule/DayTabs";
import { ClassCard } from "@/components/schedule/ClassCard";
import type { ClassType, ClassStatus, ScheduleClass } from "@/components/schedule/scheduleData";
import { classesForDay, createClass, updateClass, deleteClass, loadScheduleLocal, useScheduleData } from "@/lib/noteme/scheduleStore";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const [activeDay, setActiveDay] = useState<ScheduleDayId>("jumat");
  const scheduleData = useScheduleData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [courseName, setCourseName] = useState("");
  const [lecturer, setLecturer] = useState("");
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

  const resetForm = () => {
    setEditingId(null);
    setCourseName("");
    setLecturer("");
    setDay(activeDay);
    setTime("");
    setRoom("");
    setClassType("offline");
    setStatus("upcoming");
    setLmsLabel("");
    setLmsUrl("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ScheduleClass) => {
    setEditingId(item.id);
    setCourseName(item.courseName);
    setLecturer(item.lecturer || "");
    setDay(item.day);
    setTime(item.time);
    setRoom(item.room);
    setClassType(item.classType);
    setStatus(item.status);
    setLmsLabel(item.lmsLinks[0]?.label || "");
    setLmsUrl(item.lmsLinks[0]?.url || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lmsLinks = lmsUrl ? [{ label: lmsLabel || "Live Unpad", url: lmsUrl }] : [];

    if (editingId) {
      updateClass(editingId, {
        day,
        courseName,
        lecturer,
        time,
        room,
        classType,
        status,
        lmsLinks,
      });
    } else {
      createClass({
        day,
        courseName,
        lecturer,
        time,
        room,
        classType,
        status,
        lmsLinks,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteClass(id);
  };

  const filteredClasses = useMemo(
    () => classesForDay(scheduleData, activeDay),
    [scheduleData, activeDay]
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem] text-foreground">
      <Sidebar />
      
      {/* Top Search Bar */}
      <div className="pt-4 pb-2">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Search..."
            className="glass-soft w-full rounded-full py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <ScheduleHeader />

      <div className="flex items-center justify-between my-4 gap-2">
        <DayTabs active={activeDay} onChange={setActiveDay} />
        <button
          onClick={handleOpenCreate}
          aria-label="Tambah Jadwal"
          className="press glass-soft flex size-9 flex-none items-center justify-center rounded-full text-foreground hover:bg-accent active:scale-90"
        >
          <Plus className="size-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-28">
        {filteredClasses.length === 0 && (
          <p className="px-1 py-12 text-center text-sm text-muted-foreground">
            Belum ada jadwal. Klik tombol <strong>+</strong> untuk menambahkan.
          </p>
        )}
        {filteredClasses.map((item) => (
          <ClassCard key={item.id} item={item} onEdit={handleOpenEdit} onDelete={handleDelete} />
        ))}
      </div>

      {/* Pop-up Modal Input / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="glass-soft w-full max-w-md rounded-2xl p-6 shadow-2xl text-foreground">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold">
                {editingId ? "Edit Jadwal Kuliah" : "Tambah Jadwal Baru"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">Nama Mata Kuliah</label>
                <input
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="contoh: Pengembangan Produk"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Nama Dosen Pengampu</label>
                <input
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="contoh: Dr. Andi Wijaya"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground font-medium">Hari</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as ScheduleDayId)}
                    className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground focus:outline-none"
                  >
                    {SCHEDULE_DAYS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-background text-foreground">{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Jam Kuliah</label>
                  <input
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                    placeholder="07:00 - 09:30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-muted-foreground font-medium">Ruangan / Lokasi</label>
                  <input
                    required
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                    placeholder="LAMBDA 0715-0204"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Tipe Kelas</label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value as ClassType)}
                    className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground focus:outline-none"
                  >
                    <option value="offline" className="bg-background text-foreground">Offline Class</option>
                    <option value="online" className="bg-background text-foreground">Online Class</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Status Pertemuan</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClassStatus)}
                  className="glass-soft w-full rounded-xl p-2.5 mt-1 text-foreground focus:outline-none"
                >
                  <option value="upcoming" className="bg-background text-foreground">Upcoming</option>
                  <option value="ongoing" className="bg-background text-foreground">Ongoing</option>
                  <option value="done" className="bg-background text-foreground">Done</option>
                </select>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-primary">Tautan LMS (Opsional)</label>
                <input
                  value={lmsLabel}
                  onChange={(e) => setLmsLabel(e.target.value)}
                  className="glass-soft w-full rounded-xl p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Label (misal: Live Unpad)"
                />
                <input
                  value={lmsUrl}
                  onChange={(e) => setLmsUrl(e.target.value)}
                  className="glass-soft w-full rounded-xl p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="URL (https://...)"
                />
              </div>

              <button
                type="submit"
                className="press w-full mt-4 rounded-xl bg-primary p-3 font-bold text-primary-foreground active:scale-98"
              >
                {editingId ? "Simpan Perubahan" : "Simpan Jadwal"}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
