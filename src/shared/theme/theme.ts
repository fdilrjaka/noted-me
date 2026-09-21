import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "noteme.theme";

/** Tema yang benar-benar dipakai di layar. */
export type ThemeMode = "light" | "dark";
/** Pilihan user: terang, gelap, atau otomatis mengikuti jam. */
export type ThemePreference = ThemeMode | "auto";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "auto";

/**
 * Jadwal mode Auto (jam perangkat): terang mulai 06.00 sampai sebelum 16.00 (jam 15.59),
 * gelap mulai 16.00 sampai sebelum 06.00 (jam 05.59). Ubah dua angka ini kalau jadwalnya berubah.
 */
export const AUTO_LIGHT_START_HOUR = 6;
export const AUTO_DARK_START_HOUR = 16;

const pad = (h: number) => String(h).padStart(2, "0");
export const AUTO_SCHEDULE_TEXT = `terang ${pad(AUTO_LIGHT_START_HOUR)}.00–${pad(AUTO_DARK_START_HOUR - 1)}.59, gelap ${pad(AUTO_DARK_START_HOUR)}.00–${pad(AUTO_LIGHT_START_HOUR - 1)}.59`;

export function resolveAutoTheme(now: Date = new Date()): ThemeMode {
  const hour = now.getHours();
  return hour >= AUTO_LIGHT_START_HOUR && hour < AUTO_DARK_START_HOUR ? "light" : "dark";
}

export function resolveThemePreference(pref: ThemePreference, now?: Date): ThemeMode {
  return pref === "auto" ? resolveAutoTheme(now) : pref;
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFERENCE;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "auto") return saved;
  } catch {
    // localStorage diblokir: pakai default.
  }
  return DEFAULT_THEME_PREFERENCE;
}

/** Tema yang harus tampil sekarang berdasarkan pilihan tersimpan (Auto = lihat jam). */
export function readThemeMode(): ThemeMode {
  return resolveThemePreference(readThemePreference());
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  html.dataset["theme"] = mode;

  // HOTFIX: sinkronkan dengan Tailwind dark: yang memakai class
  if (mode === "dark") html.classList.add("dark");
  else html.classList.remove("dark");

  document.documentElement.style.colorScheme = mode;
}

function saveThemePreference(pref: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // localStorage tidak tersedia (mode privat / diblokir): tema tetap berlaku untuk sesi ini.
  }
}

const THEME_APPLIED_EVENT = "noteme:theme-applied";

/**
 * Dipasang sekali di root: selama pilihan = Auto, cek jam secara berkala (dan saat tab kembali
 * aktif, mis. setelah laptop tidur) lalu ganti tema kalau sudah melewati batas jam.
 */
export function useAutoTheme() {
  useEffect(() => {
    const sync = () => {
      if (readThemePreference() !== "auto") return;
      const next = resolveAutoTheme();
      if (document.documentElement.dataset["theme"] === next) return;
      applyThemeMode(next);
      window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_APPLIED_EVENT, { detail: next }));
    };
    sync();
    const timer = window.setInterval(sync, 30_000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);
}

export function useThemeMode() {
  const [themePref, setThemePrefState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const pref = readThemePreference();
    const mode = resolveThemePreference(pref);
    setThemePrefState(pref);
    setThemeModeState(mode);
    applyThemeMode(mode);

    // Tema berganti sendiri saat lewat batas jam (mode Auto).
    const onApplied = (e: Event) => setThemeModeState((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener(THEME_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(THEME_APPLIED_EVENT, onApplied);
  }, []);

  /** Simpan pilihan; kalau tema yang tampil berubah, jalankan animasi wipe dari titik klik. */
  const setThemePrefAnimated = useCallback((pref: ThemePreference, x: number, y: number) => {
    const next = resolveThemePreference(pref);
    const current = document.documentElement.dataset["theme"];
    setThemePrefState(pref);
    setThemeModeState(next);
    saveThemePreference(pref);
    if (current === next) return;
    window.dispatchEvent(
      new CustomEvent("noteme:theme-transition", { detail: { toMode: next, x, y } }),
    );
  }, []);

  return { themePref, themeMode, setThemePrefAnimated };
}
