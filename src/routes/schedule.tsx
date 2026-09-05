import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { DayTabs, type ScheduleDayId } from "@/components/schedule/DayTabs";
import { ClassCard } from "@/components/schedule/ClassCard";
import { SAMPLE_CLASSES } from "@/components/schedule/scheduleData";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Jadwal Mata Kuliah — NoteMe" },
      { name: "description", content: "Jadwal mata kuliah per hari." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const [activeDay, setActiveDay] = useState<ScheduleDayId>("senin");

  const classes = useMemo(
    () => SAMPLE_CLASSES.filter((c) => c.day === activeDay),
    [activeDay],
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem]">
      <Sidebar />
      <ScheduleHeader />

      <DayTabs active={activeDay} onChange={setActiveDay} />

      <div className="mt-4 flex flex-col gap-3 pb-28">
        {classes.length === 0 && (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Belum ada mata kuliah untuk hari ini.
          </p>
        )}
        {classes.map((item) => (
          <ClassCard key={item.id} item={item} />
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
