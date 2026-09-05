import { useEffect, useState } from "react";

const DURATION = 3000;

type Stage = "enter" | "press" | "glass" | "zoom";

/**
 * Intro splash: teks "NoteMe." putih di background hitam.
 * Sequence: enter -> press (klik) -> spin jadi Liquid Glass -> zoom in -> masuk app.
 */
export function SplashIntro() {
  const [show, setShow] = useState(true);
  const [stage, setStage] = useState<Stage>("enter");

  useEffect(() => {
    const tPress = window.setTimeout(() => setStage("press"), 500);
    const tGlass = window.setTimeout(() => setStage("glass"), 720);
    const tZoom = window.setTimeout(() => setStage("zoom"), 1650);
    const tGone = window.setTimeout(() => setShow(false), DURATION);
    return () => {
      window.clearTimeout(tPress);
      window.clearTimeout(tGlass);
      window.clearTimeout(tZoom);
      window.clearTimeout(tGone);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: "#000" }}
      role="status"
      aria-label="Memuat NoteMe"
    >
      <div className={`splash-glass-wrap stage-${stage}`}>
        {/* Ripple efek klik */}
        {stage === "press" && <span className="splash-ripple" />}

        {/* Panel Liquid Glass — muncul & membesar pas stage "glass" */}
        <div className="splash-glass-panel" />

        {/* Sheen / refraksi kaca yang sapu lewat */}
        <div className="splash-glass-sheen" />

        <h1 className="splash-word">NoteMe.</h1>
      </div>
    </div>
  );
}
