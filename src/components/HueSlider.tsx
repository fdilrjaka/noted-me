import { Palette } from "lucide-react";

type HueSliderProps = {
  hue: number;
  onChange: (hue: number) => void;
};

/** Slider hue tunggal: user geser satu warna, gradient latar dibangun otomatis
 *  dengan dasar ungu. */
export function HueSlider({ hue, onChange }: HueSliderProps) {
  return (
    <label className="flex items-center gap-3 text-card-foreground/80">
      <Palette className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">Warna latar</span>
      <input
        type="range"
        min={0}
        max={359}
        step={1}
        value={hue}
        aria-label="Warna latar"
        onChange={(event) => onChange(Number(event.target.value))}
        className="hue-range h-2 w-36 cursor-pointer appearance-none rounded-full sm:w-48"
      />
      <span
        className="size-5 shrink-0 rounded-full border border-border"
        style={{ background: `oklch(0.6 0.19 ${hue})` }}
        aria-hidden
      />
    </label>
  );
}
