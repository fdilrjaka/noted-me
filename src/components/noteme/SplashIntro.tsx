import { useEffect, useState } from "react";
import "./splash.css";

/** Total durasi splash sebelum unmount (ms) */
const TOTAL_DURATION = 3000;

/** Titik transisi tiap stage, sesuai spesifikasi timeline */
const STAGE_ENTER_MS = 0;
const STAGE_PRESS_MS = 500;
const STAGE_GLASS_MS = 720;
const STAGE_ZOOM_MS = 1700;
/** Setelah zoom selesai (~2500ms) disisakan buffer sampai TOTAL_DURATION agar
 *  layar sudah benar-benar transparan/hitam sebelum splash di-unmount. */

type Stage = "enter" | "press" | "glass" | "zoom";

/**
 * Splash Intro — "NoteMe."
 * Background hitam murni, teks putih dengan tipografi tebal ala Apple.
 *
 * Sequence:
 *  1. enter  (0ms   - 500ms)  fade in + scale halus
 *  2. press  (500ms - 720ms)  scale 0.95 seolah ditekan + ripple air
 *  3. glass  (720ms - 1700ms) 3D flip 360deg sumbu Y + morph jadi liquid glass
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
    <div
      className="splash-root"
      role="status"
      aria-label="Memuat NoteMe"
    >
      <div className={`splash-stage stage-${stage}`}>
        {/* Ripple air — hanya aktif di stage "press" */}
        <span className="splash-ripple splash-ripple--a" />
        <span className="splash-ripple splash-ripple--b" />

        {/* Panel Liquid Glass di belakang teks — muncul dari stage "glass" */}
        <div className="splash-glass-panel">
          <div className="splash-glass-liquid" />
          <div className="splash-glass-sheen" />
        </div>

        <h1 className="splash-word">NoteMe.</h1>
      </div>
    </div>
  );
}

export default SplashIntro;
