import { useEffect, useState } from "react";
import { FileJson, FileText, Upload } from "lucide-react";
import { exportBackupJson, exportBackupMarkdown } from "@/import-export/backupExport";
import type { useAccountSettings } from "../hooks/useAccountSettings";
import type { SettingsDraft } from "../hooks/useSettingsDraft";
import { ComingSoonRow } from "./ComingSoonRow";
import { Toggle } from "./Toggle";
import { darkBtn } from "./buttonStyles";

function formatOffset(minutesEast: number) {
  const sign = minutesEast >= 0 ? "+" : "−";
  const abs = Math.abs(minutesEast);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="min-w-0 flex-1 sm:max-w-[16rem]">{children}</div>
    </div>
  );
}

const valueCls =
  "glass-input flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm";
const soonPill =
  "flex-none rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground";

/** Kolom kanan: preferensi, notifikasi, impor/ekspor, integrasi. (Tema ada di bar atas halaman.) */
export function PreferencesPanel({
  draft,
  account,
}: {
  draft: SettingsDraft;
  account: ReturnType<typeof useAccountSettings>;
}) {
  const { importBusy, importInputRef, handleImportFile } = account;
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(`${zone} (${formatOffset(-new Date().getTimezoneOffset())})`);
  }, []);

  return (
    <>
      <section id="sec-preferensi" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Preferensi Penggunaan</h2>
        <div className="mt-4 flex flex-col gap-3">
          <PrefRow label="Bahasa Tampilan">
            <div className={valueCls}>
              <span className="truncate">Indonesia (IDN)</span>
              <span className={soonPill}>Segera hadir</span>
            </div>
          </PrefRow>
          <PrefRow label="Sinkronisasi Kalender">
            <div className={valueCls}>
              <span className="truncate">Google Calendar</span>
              <span className={soonPill}>Segera hadir</span>
            </div>
          </PrefRow>
          <PrefRow label="Zona Waktu">
            <div className={valueCls}>
              <span className="truncate">{timezone || "…"}</span>
            </div>
          </PrefRow>
          <p className="text-xs text-muted-foreground">
            Zona waktu mengikuti perangkat dan dipakai untuk jadwal mode Auto.
          </p>
        </div>
      </section>

      <section id="sec-notifikasi" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Notifikasi & Pengingat</h2>
        <div className="mt-3 flex flex-col divide-y divide-border">
          <Toggle
            checked={draft.todoReminders}
            onChange={draft.setTodoReminders}
            label="Pengingat To-Do List"
            sublabel="Tampilkan tugas yang jatuh tempo di bell dashboard"
          />
          <Toggle
            checked={draft.scheduleReminders}
            onChange={draft.setScheduleReminders}
            label="Pengingat Jadwal"
            sublabel="Tampilkan kelas hari ini di bell dashboard"
          />
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <ComingSoonRow label="Kunci Aplikasi" sublabel="Kunci dengan PIN/biometrik" />
        </div>
      </section>

      <section id="sec-data" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Fungsi Impor & Ekspor</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={() => void exportBackupJson()} className={`${darkBtn} py-2.5`}>
            <FileJson className="size-4" /> Ekspor Backup (JSON)
          </button>
          <button onClick={() => exportBackupMarkdown()} className={`${darkBtn} py-2.5`}>
            <FileText className="size-4" /> Ekspor Semua (Markdown)
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importBusy}
            className={`${darkBtn} py-2.5 sm:col-span-2`}
          >
            <Upload className="size-4" />
            {importBusy ? "Memulihkan…" : "Impor Cadangan JSON"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleImportFile(e.target.files?.[0])}
          />
        </div>
        <div className="mt-2">
          <ComingSoonRow label="Impor dari Evernote / OneNote" />
        </div>
      </section>

      <section id="sec-integrasi" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Integrasi & API</h2>
        <div className="mt-3 flex flex-col gap-1.5">
          <ComingSoonRow label="Google Calendar" sublabel="Sinkronisasi dua arah" />
          <ComingSoonRow label="Microsoft Outlook" sublabel="Sinkronisasi dua arah" />
          <ComingSoonRow label="Notion" sublabel="Impor & sinkronisasi catatan" />
        </div>
      </section>
    </>
  );
}
