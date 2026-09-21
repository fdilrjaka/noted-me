import { AUTO_SCHEDULE_TEXT, type ThemeMode, type ThemePreference } from "@/shared/theme/theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Light Mode" },
  { id: "auto", label: "Auto (System)" },
  { id: "dark", label: "Night Mode" },
];

/** Segmented control 3 pilihan. Auto = terang/gelap otomatis mengikuti jam (lihat theme.ts). */
export function ThemeModeSwitch({
  pref,
  mode,
  onChange,
}: {
  pref: ThemePreference;
  mode: ThemeMode;
  onChange: (pref: ThemePreference, x: number, y: number) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div
        role="radiogroup"
        aria-label="Mode Tampilan"
        className="glass-soft grid grid-cols-3 gap-1 rounded-full p-1"
      >
        {OPTIONS.map((o) => {
          const selected = pref === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={(e) => onChange(o.id, e.clientX, e.clientY)}
              className={`press-sm rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "bg-card text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {pref === "auto" && (
        <p className="mt-1.5 px-3 text-xs text-muted-foreground">
          Otomatis mengikuti jam perangkat: {AUTO_SCHEDULE_TEXT}. Sekarang:{" "}
          {mode === "light" ? "terang" : "gelap"}.
        </p>
      )}
    </div>
  );
}
