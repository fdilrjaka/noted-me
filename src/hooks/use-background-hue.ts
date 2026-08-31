import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "note-bg-hue";
export const DEFAULT_HUE = 320;

/** Hue ungu yang jadi "dasar" gradient. Semua warna pilihan ditarik ke arah
 *  ini supaya latar apa pun tetap satu keluarga dan tidak menyilaukan. */
const PURPLE_BASE = 300;
/** Kekuatan tarikan ungu (0-1). 2/5 pada skala user. */
const PURPLE_PULL = 0.4;

/** Interpolasi hue di lingkaran warna (jalur terpendek). */
function mixHue(hue: number, target: number, amount: number) {
  let delta = ((target - hue + 540) % 360) - 180;
  return (hue + delta * amount + 360) % 360;
}

export function applyHue(hue: number) {
  const root = document.documentElement.style;
  const top = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 1.35);
  const mid = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 0.7);

  // Lightness/chroma tetap redup di semua hue: aman untuk menulis lama.
  root.setProperty("--glow-blue", `oklch(0.26 0.09 ${top.toFixed(1)})`);
  root.setProperty("--glow-purple", `oklch(0.4 0.15 ${mid.toFixed(1)})`);
  root.setProperty("--glow-pink", `oklch(0.52 0.19 ${hue.toFixed(1)})`);
  root.setProperty("--background", `oklch(0.145 0.055 ${top.toFixed(1)})`);
  root.setProperty("--primary", `oklch(0.7 0.15 ${hue.toFixed(1)})`);
  root.setProperty("--accent", `oklch(0.6 0.19 ${hue.toFixed(1)})`);
  root.setProperty("--ring", `oklch(0.7 0.15 ${hue.toFixed(1)})`);
}

export function useBackgroundHue() {
  const [hue, setHue] = useState(DEFAULT_HUE);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) setHue(saved);
  }, []);

  useEffect(() => {
    applyHue(hue);
    window.localStorage.setItem(STORAGE_KEY, String(hue));
  }, [hue]);

  const updateHue = useCallback((next: number) => setHue(next), []);

  return { hue, setHue: updateHue };
}
