export const THEME_STORAGE_KEY = "noteme.theme";

export const THEME_PRESETS = [
  { label: "Anggur", value: "#7c3aed" },
  { label: "Beri", value: "#be185d" },
  { label: "Laut", value: "#0369a1" },
  { label: "Hutan", value: "#047857" },
  { label: "Senja", value: "#c2410c" },
] as const;

export type ThemePreference = {
  color: string;
  intensity: number;
};

export const DEFAULT_THEME: ThemePreference = {
  color: THEME_PRESETS[0].value,
  intensity: 38,
};

export function readTheme(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null") as
      | Partial<ThemePreference>
      | null;
    return {
      color: typeof saved?.color === "string" ? saved.color : DEFAULT_THEME.color,
      intensity:
        typeof saved?.intensity === "number" ? saved.intensity : DEFAULT_THEME.intensity,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const intensity = Math.min(70, Math.max(18, theme.intensity));
  document.documentElement.style.setProperty("--user-theme-color", theme.color);
  document.documentElement.style.setProperty("--user-theme-intensity", `${intensity}%`);
}

export function saveTheme(theme: ThemePreference) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // The current session still uses the selected theme when storage is unavailable.
  }
}