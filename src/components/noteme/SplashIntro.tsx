import { useEffect, useState } from "react";
import "./splash.css";

/** Total durasi splash sebelum unmount (ms) */
const TOTAL_DURATION = 3000;

const STAGE_PRESS_MS = 500;
const STAGE_GLASS_MS = 720;
const STAGE_ZOOM_MS = 1700;

type Stage = "enter" | "press" | "glass" | "zoom";

/**
 * Splash Intro — iOS Liquid Glass 3D Icon "NoteMe."
 * Squircle glassmorphism icon dengan teks emboss/refraksi,
 * di atas background deep midnight blue/purple berlapis ambient curved shapes.
 *
 * Sequence:
 *  1. enter  (0ms   - 500ms)   fade in + scale halus
 *  2. press  (500ms - 720ms)   scale 0.95 seolah ditekan + ripple air
 *  3. glass  (720ms - 1700ms)  3D flip + intensifikasi glass, sheen sweep
 *  4. zoom   (1700ms - 2500ms) scale up dramatis + fade out ke aplikasi
 */
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
      {/* Background midnight blue/purple + curved ambient layers untuk depth */}
      <div className="splash-bg">
        <span className="splash-ambient splash-ambient--a" />
        <span className="splash-ambient splash-ambient--b" />
        <span className="splash-ambient splash-ambient--c" />
      </div>

      <div className={`splash-stage stage-${stage}`}>
        {/* Ripple air — hanya aktif di stage "press" */}
        <span className="splash-ripple splash-ripple--a" />
        <span className="splash-ripple splash-ripple--b" />

        {/* Squircle Glass Container ala iOS Liquid Glass icon */}
        <div className="splash-icon">
          <div className="splash-icon-top-highlight" />
          <div className="splash-icon-liquid" />
          <div className="splash-icon-sheen" />
          <h1 className="splash-word">NoteMe.</h1>
        </div>
      </div>
    </div>
  );
}

export default SplashIntro;
