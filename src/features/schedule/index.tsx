import { useMemo, useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { DayTabs, type ScheduleDayId } from "@/components/schedule/DayTabs";
import { ClassCard } from "@/components/schedule/ClassCard";
import { classesForDay, loadScheduleLocal, useScheduleData } from "@/lib/noteme/scheduleStore";
import { useClassForm } from "./hooks/useClassForm";
import { ClassFormModal } from "./components/ClassFormModal";

export function SchedulePage() {
  const [activeDay, setActiveDay] = useState<ScheduleDayId>("jumat");
  const scheduleData = useScheduleData();
  const form = useClassForm(activeDay);

  useEffect(() => {
    loadScheduleLocal();
  }, []);

  const filteredClasses = useMemo(
    () => classesForDay(scheduleData, activeDay),
    [scheduleData, activeDay],
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
          onClick={form.handleOpenCreate}
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
          <ClassCard
            key={item.id}
            item={item}
            onEdit={form.handleOpenEdit}
            onDelete={form.handleDelete}
          />
        ))}
      </div>
      {form.isModalOpen && <ClassFormModal form={form} />}
      <BottomNav />
    </main>
  );
}
