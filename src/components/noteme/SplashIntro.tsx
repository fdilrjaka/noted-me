import { useEffect, useState } from "react";
import "./splash.css";

const TOTAL_DURATION = 3200;
const STAGE_PRESS_MS = 550;
const STAGE_GLASS_MS = 850;
const STAGE_ZOOM_MS = 1950;

type Stage = "enter" | "press" | "glass" | "zoom";

export function SplashIntro() {
  const [show, setShow] = useState(true);
  const [stage, setStage] = useState<Stage>("enter");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage("press"), STAGE_PRESS_MS),
      window.setTimeout(() => setStage("glass"), STAGE_GLASS_MS),
      window.setTimeout(() => setStage("zoom"), STAGE_ZOOM_MS),
      window.setTimeout(() => setShow(false), TOTAL_DURATION),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`splash-root stage-${stage}`}
      role="status"
      aria-label="Memuat NoteMe"
    >
      <div className="splash-ambient-bg">
        <div className="ambient-layer-1" />
        <div className="ambient-layer-2" />
        <div className="ambient-layer-3" />
      </div>

      <div className="splash-vignette" />

      <div className="splash-stage">
        <div className="splash-squircle">
          <div className="glass-backlight" />
          <div className="glass-refraction" />
          <div className="glass-highlight" />
          <div className="glass-sheen" />
          <div className="glass-noise" />

          <h1 className="splash-text-emboss">
            NoteMe.
          </h1>
        </div>
      </div>
    </div>
  );
}

export default SplashIntro;
