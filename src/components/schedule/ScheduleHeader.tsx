import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { SyncStatus } from "@/components/noteme/SyncEngine";

export function ScheduleHeader() {
  return (
    <header className="flex items-center justify-between gap-3 pb-2 pt-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          to="/explore"
          aria-label="Kembali"
          className="press glass-floating flex size-9 flex-none items-center justify-center rounded-full active:scale-90"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Jadwal Mata Kuliah</h1>
          <div className="mt-0.5">
            <SyncStatus />
          </div>
        </div>
      </div>
    </header>
  );
}
