import { useEffect, useMemo, useRef, useState } from "react";
import { parseNaturalDate, toDateInputValue, toTimeInputValue } from "@/shared/utils/naturalDate";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Dipanggil begitu tanggal/waktu berhasil kedetect & judul sudah dibersihkan dari frasenya. */
  onDetected?: (result: { date: string; time: string }) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
};

/**
 * Input satu baris yang meng-highlight frasa tanggal/waktu ("besok jam 10.30", "lusa siang", dst)
 * secara real-time sambil user ngetik — mirip Todoist. Begitu user selesai (blur / Enter),
 * frasenya otomatis dibuang dari judul dan tanggal/waktunya di-emit lewat onDetected.
 */
export function NaturalDateTitleInput({
  value,
  onChange,
  onDetected,
  placeholder,
  className = "",
  autoFocus,
  onEnter,
  onEscape,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [scrollX, setScrollX] = useState(0);

  const parsed = useMemo(() => parseNaturalDate(value), [value]);

  const commitDetection = () => {
    if (!parsed.date || parsed.matches.length === 0) return;
    onChange(parsed.cleanedTitle);
    onDetected?.({
      date: toDateInputValue(parsed.date),
      time: parsed.hasTime ? toTimeInputValue(parsed.date) : "",
    });
  };

  useEffect(() => {
    // sinkronin scroll horizontal input <-> overlay biar highlight ga geser pas teks panjang
    const el = inputRef.current;
    if (!el) return;
    const onScroll = () => setScrollX(el.scrollLeft);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const segments = useMemo(() => {
    const sorted = [...parsed.matches].sort((a, b) => a.start - b.start);
    const parts: { text: string; highlighted: boolean }[] = [];
    let cursor = 0;
    for (const m of sorted) {
      if (m.start > cursor) parts.push({ text: value.slice(cursor, m.start), highlighted: false });
      parts.push({ text: value.slice(m.start, m.end), highlighted: true });
      cursor = m.end;
    }
    if (cursor < value.length) parts.push({ text: value.slice(cursor), highlighted: false });
    if (parts.length === 0) parts.push({ text: value, highlighted: false });
    return parts;
  }, [value, parsed.matches]);

  return (
    <div className="relative">
      <div
        ref={overlayRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-sm ${className}`}
        style={{ transform: `translateX(-${scrollX}px)` }}
      >
        {value.length === 0 && placeholder ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          segments.map((seg, i) =>
            seg.highlighted ? (
              <span
                key={i}
                className="rounded-[4px] bg-primary/25 text-transparent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i} className="text-transparent">
                {seg.text}
              </span>
            ),
          )
        )}
      </div>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={commitDetection}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitDetection();
            onEnter?.();
          }
          if (e.key === "Escape") onEscape?.();
        }}
        placeholder={placeholder}
        className={`relative w-full bg-transparent text-sm text-foreground caret-foreground outline-none placeholder:text-transparent ${className}`}
      />
    </div>
  );
}
