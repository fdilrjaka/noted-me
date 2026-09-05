import { useEffect, useState } from "react";
import "./splash.css";

const TOTAL_DURATION = 3000;
const STAGE_PRESS_MS = 500;
const STAGE_GLASS_MS = 720;
const STAGE_ZOOM_MS = 1700;

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
    <div className="splash-root" role="status" aria-label="Memuat NoteMe">
      {/* Background Layer Bergelombang ala Wallpaper iOS 26 */}
      <div className="splash-ambient-bg">
        <div className="ambient-layer-1" />
        <div className="ambient-layer-2" />
      </div>

      {/* Main Squircle Glass Box */}
      <div className={`splash-stage stage-${stage}`}>
        <div className="splash-squircle">
          <div className="splash-sheen" />
          <span className="splash-text-emboss">26</span>
        </div>
      </div>
    </div>
  );
}

export default SplashIntro;
