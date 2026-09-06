import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "note-bg-hue";
/** Hue default: magenta/ungu di kanan-atas, berpasangan otomatis dengan
 *  hijau-teal di kiri-bawah lewat GREEN_OFFSET — persis komposisi dasar
 *  yang dipakai sebagai basis tampilan di semua halaman. */
export const DEFAULT_HUE = 320;

/** Hue ungu yang jadi "dasar" gradient. Semua warna pilihan ditarik ke arah
 *  ini supaya latar apa pun tetap satu keluarga dan tidak menyilaukan. */
const PURPLE_BASE = 300;
/** Kekuatan tarikan ungu (0-1). 2/5 pada skala user. */
const PURPLE_PULL = 0.4;

/** Pasangan hijau/teal ditarik berlawanan dari hue utama supaya dua area
 *  gradasi (hijau vs magenta-ungu) selalu kontras tapi tetap serasi,
 *  mengikuti geseran hue yang sama seperti pada screenshot dasar. */
const GREEN_BASE = 155;
const GREEN_PULL = 0.35;
const GREEN_SPREAD = 150;

/** Interpolasi hue di lingkaran warna (jalur terpendek). */
function mixHue(hue: number, target: number, amount: number) {
  let delta = ((target - hue + 540) % 360) - 180;
  return (hue + delta * amount + 360) % 360;
}

export function applyHue(hue: number) {
  const root = document.documentElement.style;
  const top = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 1.35);
  const mid = mixHue(hue, PURPLE_BASE, PURPLE_PULL * 0.7);
  const greenRaw = (hue - GREEN_SPREAD + 360) % 360;
  const green = mixHue(greenRaw, GREEN_BASE, GREEN_PULL);

  // Lightness/chroma tetap redup di semua hue: aman untuk menulis lama.
  root.setProperty("--glow-blue", `oklch(0.26 0.09 ${top.toFixed(1)})`);
  root.setProperty("--glow-purple", `oklch(0.4 0.15 ${mid.toFixed(1)})`);
  root.setProperty("--glow-pink", `oklch(0.55 0.2 ${hue.toFixed(1)})`);
  root.setProperty("--glow-green", `oklch(0.5 0.17 ${green.toFixed(1)})`);
  // Slider warna cuma ganti "cahaya" (glow blobs) di latar belakang.
  // --primary/--accent/--ring SENGAJA tidak disentuh di sini supaya warna
  // semua tombol & aksen di seluruh app tetap konsisten (teal) apa pun hue
  // yang dipilih user — dulu ketiga variabel ini ikut diubah, makanya warna
  // tombol berubah-ubah ikut slider.
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
