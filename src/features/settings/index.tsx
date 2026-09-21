import { useState } from "react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { useThemeMode } from "@/shared/theme/theme";
import { AccountSection } from "./components/AccountSection";
import { PreferencesPanel } from "./components/PreferencesPanel";
import { SettingsNav } from "./components/SettingsNav";
import { TagManager } from "./components/TagManager";
import { ThemeModeSwitch } from "./components/ThemeModeSwitch";
import { useAccountSettings } from "./hooks/useAccountSettings";
import { useSettingsDraft } from "./hooks/useSettingsDraft";

export function SettingsPage() {
  const { themePref, themeMode, setThemePrefAnimated } = useThemeMode();
  const draft = useSettingsDraft();
  const account = useAccountSettings();
  const [activeSection, setActiveSection] = useState("sec-akun");

  const goTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      ref={registerNavDragTarget}
      className="min-h-dvh w-full safe-top safe-bottom-lg text-foreground"
    >
      <Sidebar />
      <div className="md:pl-[5.5rem]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-6">
          <header className="pb-4 pt-5 text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
            <div className="mt-1 flex justify-center">
              <SyncStatus />
            </div>
          </header>

          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-6">
            <p className="flex-none px-1 text-lg font-semibold md:w-44 md:pt-1.5">Mode Tampilan</p>
            <ThemeModeSwitch pref={themePref} mode={themeMode} onChange={setThemePrefAnimated} />
          </div>

          <div className="glass-card flex flex-col overflow-hidden rounded-3xl lg:h-[calc(100dvh-16rem)] lg:min-h-[34rem] lg:flex-row">
            <div className="flex-none border-b border-border lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <SettingsNav active={activeSection} onSelect={goTo} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-8 gap-y-8 overflow-y-auto p-5 lg:grid-cols-2 lg:p-6">
                <div className="flex min-w-0 flex-col gap-8">
                  <AccountSection draft={draft} account={account} />
                  <TagManager />
                </div>
                <div className="flex min-w-0 flex-col gap-8 lg:border-l lg:border-border lg:pl-8">
                  <PreferencesPanel draft={draft} account={account} />
                </div>
              </div>

              <div className="flex flex-none items-center gap-2 border-t border-border px-5 py-3">
                <button
                  onClick={() => void draft.save()}
                  disabled={!draft.dirty || draft.saving}
                  className="press-sm rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {draft.saving ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
                <button
                  onClick={draft.cancel}
                  disabled={!draft.dirty || draft.saving}
                  className="press-sm rounded-xl border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                {draft.dirty && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    Ada perubahan yang belum disimpan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
