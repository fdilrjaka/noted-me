import { useCallback, useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "noteme.theme";

export type ThemeMode = "light" | "dark";
export const DEFAULT_THEME_MODE: ThemeMode = "light";

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  html.dataset.theme = mode;

  // HOTFIX: sinkronkan dengan Tailwind dark: yang memakai class
  if (mode === "dark") html.classList.add("dark");
  else html.classList.remove("dark");

  document.documentElement.style.colorScheme = mode;
}

export function saveThemeMode(mode: ThemeMode) {
  applyThemeMode(mode);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {}
}

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);

  useEffect(() => {
    const initial = readThemeMode();
    setThemeModeState(initial);
    applyThemeMode(initial);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeMode(mode);
  }, []);

  const setThemeModeAnimated = useCallback((mode: ThemeMode, x: number, y: number) => {
    setThemeModeState(mode);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, mode); } catch {}
    window.dispatchEvent(new CustomEvent("noteme:theme-transition", { detail: { toMode: mode, x, y } }));
  }, []);

  return { themeMode, setThemeMode, setThemeModeAnimated };
}
