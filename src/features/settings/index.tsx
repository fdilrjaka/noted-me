import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  Download,
  FileJson,
  FileText,
  KeyRound,
  ListChecks,
  LogOut,
  Notebook,
  Palette,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/noteme/Sidebar";
import { BottomNav } from "@/components/noteme/BottomNav";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { useThemeMode } from "@/shared/theme/theme";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { syncAndSignOut } from "@/features/auth/signOut";
import { exportBackupJson, exportBackupMarkdown } from "@/import-export/backupExport";
import { useNotifPrefs, setNotifPref } from "@/lib/noteme/notifPrefs";
import { SettingCard } from "./components/SettingCard";
import { Toggle } from "./components/Toggle";
import { ComingSoonRow } from "./components/ComingSoonRow";
import { useAccountSettings } from "./hooks/useAccountSettings";
import { PasswordHint } from "@/features/auth/components/PasswordHint";
import { RecoveryCodesDialog } from "@/features/auth/components/RecoveryCodesDialog";

export function SettingsPage() {
  const { user } = useSession();
  const { themeMode, setThemeModeAnimated } = useThemeMode();
  const notifPrefs = useNotifPrefs();
  const {
    newPassword,
    setNewPassword,
    savingPassword,
    changePassword,
    importBusy,
    importInputRef,
    handleImportFile,
    recoveryRemaining,
    recoveryPassword,
    setRecoveryPassword,
    generatingCodes,
    generateCodes,
    generatedCodes,
    clearGeneratedCodes,
  } = useAccountSettings();
  const usernameLabel = user?.email?.replace("@noteme.app", "") ?? "";
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const nickname = typeof meta["nickname"] === "string" ? (meta["nickname"] as string) : "";

  return (
    <main ref={registerNavDragTarget} className="min-h-dvh w-full safe-top safe-bottom-lg">
      <Sidebar />
      <div className="md:ml-[5.5rem]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-10">
          <header className="flex items-center gap-3 py-4">
            <Link
              to="/"
              aria-label="Kembali"
              className="press glass-floating flex size-10 flex-none items-center justify-center rounded-full active:scale-90"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
              <div className="mt-0.5">
                <SyncStatus />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-1">
              <SettingCard icon={User} title="Akun">
                <p className="text-sm font-medium">{nickname || usernameLabel || "Belum login"}</p>
                {usernameLabel && <p className="text-xs text-muted-foreground">@{usernameLabel}</p>}
                <Link
                  to="/auth"
                  className="press-sm mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                >
                  Kelola foto & nama profil →
                </Link>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    <KeyRound className="size-3.5" /> Ubah Password
                  </p>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password baru"
                    className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {newPassword && <PasswordHint password={newPassword} className="mt-2 px-1" />}
                  <button
                    onClick={() => void changePassword()}
                    disabled={savingPassword || !newPassword}
                    className="press mt-2 w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {savingPassword ? "Menyimpan…" : "Simpan Password"}
                  </button>
                </div>
                {user && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      <ShieldCheck className="size-3.5" /> Kode Pemulihan
                    </p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Dipakai untuk mengatur ulang password kalau lupa.
                      {recoveryRemaining !== null &&
                        (recoveryRemaining > 0
                          ? ` Tersisa ${recoveryRemaining} kode.`
                          : " Belum ada kode aktif, buat sekarang.")}
                    </p>
                    <input
                      type="password"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      placeholder="Password saat ini"
                      autoComplete="current-password"
                      className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={() => void generateCodes()}
                      disabled={generatingCodes || !recoveryPassword}
                      className="press mt-2 w-full rounded-xl border border-border py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {generatingCodes
                        ? "Membuat…"
                        : recoveryRemaining
                          ? "Buat kode baru (kode lama hangus)"
                          : "Buat kode pemulihan"}
                    </button>
                  </div>
                )}
                <RecoveryCodesDialog codes={generatedCodes} onDone={clearGeneratedCodes} />
                <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-destructive uppercase">
                    Zona Berbahaya
                  </p>
                  <button
                    onClick={() => void (user ? syncAndSignOut(user.id) : supabase.auth.signOut())}
                    className="press-sm flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium active:scale-95"
                  >
                    <LogOut className="size-4" /> Keluar
                  </button>
                  <button
                    onClick={() =>
                      toast("Hapus akun belum tersedia — hubungi dukungan untuk permintaan ini.")
                    }
                    className="press-sm mt-2 w-full rounded-xl py-2 text-sm font-medium text-destructive/80"
                  >
                    Hapus Akun
                  </button>
                </div>
              </SettingCard>

              <SettingCard icon={Puzzle} title="Integrasi Aplikasi">
                <div className="flex flex-col gap-1.5">
                  <ComingSoonRow label="Google Calendar" sublabel="Sinkronisasi dua arah" />
                  <ComingSoonRow label="Microsoft Outlook" sublabel="Sinkronisasi dua arah" />
                  <ComingSoonRow label="Notion" sublabel="Impor & sinkronisasi catatan" />
                </div>
              </SettingCard>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-2">
              <SettingCard icon={Palette} title="Tampilan Aplikasi">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Mode Tampilan</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => setThemeModeAnimated("light", e.clientX, e.clientY)}
                        className={`press-sm rounded-xl border px-3 py-2 text-sm font-medium transition-all ${themeMode === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
                      >
                        Light Mode
                      </button>
                      <button
                        onClick={(e) => setThemeModeAnimated("dark", e.clientX, e.clientY)}
                        className={`press-sm rounded-xl border px-3 py-2 text-sm font-medium transition-all ${themeMode === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
                      >
                        Night Mode
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tema mengikuti setting utama aplikasi. Background catatan tidak perlu diatur
                      manual lagi.
                    </p>
                  </div>
                </div>
              </SettingCard>

              <SettingCard icon={ShieldCheck} title="Keamanan & Notifikasi">
                <div className="flex flex-col divide-y divide-border">
                  <Toggle
                    checked={notifPrefs.todoReminders}
                    onChange={(v) => setNotifPref("todoReminders", v)}
                    label="Pengingat To-Do List"
                    sublabel="Tampilkan tugas yang jatuh tempo di bell dashboard"
                  />
                  <Toggle
                    checked={notifPrefs.scheduleReminders}
                    onChange={(v) => setNotifPref("scheduleReminders", v)}
                    label="Pengingat Jadwal"
                    sublabel="Tampilkan kelas hari ini di bell dashboard"
                  />
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <ComingSoonRow label="Kunci Aplikasi" sublabel="Kunci dengan PIN/biometrik" />
                </div>
              </SettingCard>

              <SettingCard icon={Download} title="Fungsi Impor & Ekspor">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => void exportBackupJson()}
                    className="press-sm glass-input flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium active:scale-95"
                  >
                    <FileJson className="size-4" /> Ekspor Backup (JSON)
                  </button>
                  <button
                    onClick={() => exportBackupMarkdown()}
                    className="press-sm glass-input flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium active:scale-95"
                  >
                    <FileText className="size-4" /> Ekspor Semua (Markdown)
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={importBusy}
                    className="press-sm glass-input flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium active:scale-95 disabled:opacity-50 sm:col-span-2"
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
              </SettingCard>

              <SettingCard icon={Sparkles} title="Tentang NoteMe & Dukungan">
                <p className="text-sm text-muted-foreground">
                  NoteMe — catatan, to-do list, dan jadwal kuliah dalam satu tempat, tersinkron
                  otomatis ke akunmu.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link to="/" className="inline-flex items-center gap-1.5 text-primary">
                    <Notebook className="size-3.5" /> Notes
                  </Link>
                  <Link to="/todo" className="inline-flex items-center gap-1.5 text-primary">
                    <ListChecks className="size-3.5" /> To-Do List
                  </Link>
                  <Link to="/schedule" className="inline-flex items-center gap-1.5 text-primary">
                    <CalendarDays className="size-3.5" /> Jadwal
                  </Link>
                </div>
              </SettingCard>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
