import { useEffect, useState } from "react";
import { applyThemeMode, type ThemeMode } from "@/shared/theme/theme";

type Payload = { toMode: ThemeMode; x: number; y: number };

export function ThemeWipeOverlay() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Payload>).detail;
      if (!detail) return;
      setPayload(detail);
      setAnim(false);
      requestAnimationFrame(() => setAnim(true));
      window.setTimeout(() => {
        applyThemeMode(detail.toMode);
        window.setTimeout(() => setPayload(null), 120);
      }, 650);
    };
    window.addEventListener("noteme:theme-transition", handler);
    return () => window.removeEventListener("noteme:theme-transition", handler);
  }, []);

  if (!payload) return null;
  return (
    <div
      className={`theme-wipe ${anim ? "theme-wipe--anim" : ""}`}
      data-theme={payload.toMode}
      style={{ "--wipe-x": `${payload.x}px`, "--wipe-y": `${payload.y}px` } as React.CSSProperties}
    >
      <div className="theme-wipe__panel" />
    </div>
  );
}
