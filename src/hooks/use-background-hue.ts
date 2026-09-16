import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "note-bg-hue";
export const DEFAULT_HUE = 320;

const PURPLE_BASE = 300;
const PURPLE_PULL = 0.35;

const GREEN_BASE = 155;
const GREEN_PULL = 0.28;
const GREEN_SPREAD = 150;

function mixHue(hue: number, target: number, amount: number) {
  const delta = ((target - hue + 540) % 360) - 180;
  return (hue + delta * amount + 360) % 360;
}

export function applyHue(hue: number) {
  const root = document.documentElement.style;
  const top = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 1.15);
  const mid = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 0.65);
  const greenRaw = (hue - GREEN_SPREAD + 360) % 360;
  const green = mixHue(greenRaw, GREEN_BASE, GREEN_PULL);

  root.setProperty("--glow-blue", `oklch(0.2 0.05 ${top.toFixed(1)})`);
  root.setProperty("--glow-purple", `oklch(0.28 0.08 ${mid.toFixed(1)})`);
  root.setProperty("--glow-pink", `oklch(0.36 0.08 ${hue.toFixed(1)})`);
  root.setProperty("--glow-green", `oklch(0.3 0.08 ${green.toFixed(1)})`);
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
