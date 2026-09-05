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
      {/* Soft Ambient Glow di Belakang Logo */}
      <div
        className="pointer-events-none absolute size-72 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.22 260 / 0.35), transparent 70%)",
          animation: "splash-glow 2.4s var(--ease-ios) ease-in-out infinite",
        }}
      />

      {/* Main Container: Squircle iOS Modern */}
      <div
        className="relative grid size-28 place-items-center overflow-hidden rounded-[26%]"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.22 0.08 260 / 0.8), oklch(0.12 0.04 285 / 0.9))",
          backdropFilter: "blur(20px)",
          border: "1px solid oklch(1 0 0 / 0.18)",
          boxShadow:
            "0 20px 50px oklch(0 0 0 / 0.6), inset 0 1px 1px oklch(1 0 0 / 0.3), 0 0 40px oklch(0.62 0.24 265 / 0.25)",
          animation: "splash-logo-in 0.85s var(--ease-spring) both",
        }}
      >
        {/* Ikon Vektor Catatan + Pensil Pendar */}
        <div className="relative z-10">
          <svg
            className="size-12 text-blue-400 drop-shadow-[0_4px_12px_rgba(59,130,246,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Halaman Catatan */}
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
            <path d="M8 7h6" />
            <path d="M8 11h8" />
            {/* Aksen Pensil */}
            <path d="M18 21l3-3-9-9-3 3 9 9z" className="text-indigo-300" />
          </svg>
        </div>

        {/* Specular Sheen Sweep (Sinar Kilat iOS) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 35%, oklch(1 0 0 / 0.25) 50%, transparent 65%)",
            animation: "splash-shine 2.2s var(--ease-ios) 0.2s ease-out",
          }}
        />
      </div>

      {/* Teks Wordmark dengan Gradasi iOS Metalik */}
      <h1
        className="mt-6 text-4xl font-black tracking-tight"
        style={{
          animation: "splash-word-in 0.7s var(--ease-spring) 0.15s both",
        }}
      >
        <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Note
        </span>
        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(96,165,250,0.4)]">
          Me
        </span>
      </h1>
    </div>
  );
}
