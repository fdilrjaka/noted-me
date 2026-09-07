import { X } from "lucide-react";
import { SCHEDULE_DAYS, type ScheduleDayId } from "@/components/schedule/DayTabs";
import type { ClassType, ClassStatus } from "@/components/schedule/scheduleData";
import type { useClassForm } from "../hooks/useClassForm";

export function ClassFormModal({ form }: { form: ReturnType<typeof useClassForm> }) {
  const {
    editingId,
    courseName,
    setCourseName,
    lecturer,
    setLecturer,
    day,
    setDay,
    time,
    setTime,
    room,
    setRoom,
    classType,
    setClassType,
    status,
    setStatus,
    lmsLabel,
    setLmsLabel,
    lmsUrl,
    setLmsUrl,
    handleSubmit,
    setIsModalOpen,
  } = form;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="glass-soft w-full max-w-md rounded-2xl p-6 shadow-2xl text-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-base font-bold">
            {editingId ? "Edit Jadwal Kuliah" : "Tambah Jadwal Baru"}
          </h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
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
                  <option key={d.id} value={d.id} className="bg-background text-foreground">
                    {d.label}
                  </option>
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
                <option value="offline" className="bg-background text-foreground">
                  Offline Class
                </option>
                <option value="online" className="bg-background text-foreground">
                  Online Class
                </option>
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
              <option value="upcoming" className="bg-background text-foreground">
                Upcoming
              </option>
              <option value="ongoing" className="bg-background text-foreground">
                Ongoing
              </option>
              <option value="done" className="bg-background text-foreground">
                Done
              </option>
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
  );
}
