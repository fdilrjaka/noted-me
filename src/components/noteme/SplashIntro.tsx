import { useEffect, useState } from "react";

const KEY = "noteme.splash.v1";
const DURATION = 3000;

/**
 * Intro splash 3 detik: logo squircle + wordmark "NoteMe" iOS 26, lalu fade out.
 * Tampil sekali per sesi browser (sessionStorage) saat membuka aplikasi.
 */
export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    setShow(true);
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }

    const leave = window.setTimeout(() => setLeaving(true), DURATION - 550);
    const gone = window.setTimeout(() => setShow(false), DURATION);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`splash-screen ${leaving ? "splash-out" : ""}`}
      role="status"
      aria-label="Memuat NoteMe"
    >
      {/* Glow halo di belakang logo */}
      <div
        className="pointer-events-none absolute h-64 w-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.24 265 / 0.45), transparent 65%)",
          animation: "splash-glow 2.4s var(--ease-ios) ease-in-out infinite",
        }}
      />

      {/* Logo squircle — versi glass dengan motif dokumen + bars */}
      <div
        className="relative grid size-24 place-items-center overflow-hidden rounded-[28px]"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.12 0.04 285), oklch(0.18 0.05 285))",
          boxShadow:
            "0 1px 0 oklch(1 0 0 / 0.18) inset, 0 18px 50px oklch(0 0 0 / 0.6), 0 0 60px oklch(0.62 0.24 265 / 0.35)",
          animation: "splash-logo-in 0.85s var(--ease-spring) both",
        }}
      >
        {/* Dokumen + 3 bars motif (sejajar dengan logo app) */}
        <div className="relative">
          <div
            className="grid h-14 w-11 place-items-center rounded-[10px]"
            style={{
              background:
                "linear-gradient(150deg, oklch(0.62 0.24 265), oklch(0.66 0.22 300), oklch(0.68 0.22 330))",
              boxShadow: "0 2px 12px oklch(0.62 0.24 265 / 0.5)",
            }}
          >
            <span className="block h-1 w-6 my-0.5 rounded-full bg-white/85" />
            <span className="block h-1 w-6 my-0.5 rounded-full bg-white/70" />
            <span className="block h-1 w-4 my-0.5 rounded-full bg-white/60" />
          </div>
        </div>
        {/* Specular sheen sweep */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, oklch(1 0 0 / 0.35) 48%, transparent 60%)",
            animation: "splash-shine 2.2s var(--ease-ios) 0.2s ease-out",
          }}
        />
      </div>

      <h1
        className="brand-ios26 text-4xl"
        style={{ animation: "splash-word-in 0.7s var(--ease-spring) 0.15s both" }}
      >
        NoteMe
      </h1>
    </div>
  );
}
