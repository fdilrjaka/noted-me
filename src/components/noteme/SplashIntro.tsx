import { useEffect, useState } from "react";

const DURATION = 3000;

/**
 * Intro splash 3 detik: logo squircle + wordmark "NoteMe" iOS 26, lalu fade out.
 * Tampil setiap kali halaman web di-reload.
 */
export function SplashIntro() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), DURATION - 550);
    const gone = window.setTimeout(() => setShow(false), DURATION);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);

  if (!show) return null;

  const word = "NoteMe".split("");

  return (
    <div
      className={`splash-screen ${leaving ? "splash-out" : ""}`}
      role="status"
      aria-label="Memuat NoteMe"
    >
      {/* Mesh gradient ambient — 3 orb yang bergerak pelan */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute size-96 rounded-full blur-3xl"
          style={{
            top: "10%",
            left: "15%",
            background: "radial-gradient(circle, oklch(0.62 0.24 265 / 0.35), transparent 70%)",
            animation: "splash-drift-a 6s var(--ease-ios) ease-in-out infinite",
          }}
        />
        <div
          className="absolute size-80 rounded-full blur-3xl"
          style={{
            bottom: "12%",
            right: "12%",
            background: "radial-gradient(circle, oklch(0.68 0.2 300 / 0.3), transparent 70%)",
            animation: "splash-drift-b 7s var(--ease-ios) ease-in-out infinite",
          }}
        />
        <div
          className="absolute size-72 rounded-full blur-2xl"
          style={{
            top: "45%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle, oklch(0.65 0.22 260 / 0.3), transparent 70%)",
            animation: "splash-glow 2.4s var(--ease-ios) ease-in-out infinite",
          }}
        />
      </div>

      {/* Container Squircle dengan animated gradient border */}
      <div
        className="relative grid size-28 place-items-center overflow-hidden rounded-[26%]"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.22 0.08 260 / 0.8), oklch(0.12 0.04 285 / 0.9))",
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 20px 50px oklch(0 0 0 / 0.6), inset 0 1px 1px oklch(1 0 0 / 0.3), 0 0 40px oklch(0.62 0.24 265 / 0.25)",
          animation:
            "splash-logo-in 0.85s var(--ease-spring) both, splash-breathe 2.6s var(--ease-ios) 0.9s ease-in-out infinite",
        }}
      >
        {/* Border gradient berputar */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[26%]"
          style={{
            padding: "1px",
            background:
              "conic-gradient(from var(--angle, 0deg), oklch(0.7 0.2 265 / 0.7), transparent 30%, oklch(0.7 0.2 300 / 0.6) 55%, transparent 80%, oklch(0.7 0.2 265 / 0.7))",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            animation: "splash-rotate-border 3.5s linear infinite",
          }}
        />

        {/* Ikon Vektor Catatan + Pensil */}
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
            <path
              d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: "splash-draw 0.6s var(--ease-ios) 0.35s forwards",
              }}
            />
            <path
              d="M8 7h6"
              style={{
                strokeDasharray: 8,
                strokeDashoffset: 8,
                animation: "splash-draw 0.3s var(--ease-ios) 0.75s forwards",
              }}
            />
            <path
              d="M8 11h8"
              style={{
                strokeDasharray: 10,
                strokeDashoffset: 10,
                animation: "splash-draw 0.3s var(--ease-ios) 0.85s forwards",
              }}
            />
            <path
              d="M18 21l3-3-9-9-3 3 9 9z"
              className="text-indigo-300"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 30,
                animation: "splash-draw 0.4s var(--ease-ios) 0.95s forwards",
              }}
            />
          </svg>
        </div>

        {/* Sheen sweep */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 35%, oklch(1 0 0 / 0.25) 50%, transparent 65%)",
            animation: "splash-shine 2.2s var(--ease-ios) 1.3s ease-out",
          }}
        />
      </div>

      {/* Wordmark — muncul per huruf */}
      <h1 className="mt-6 flex text-4xl font-black tracking-tight">
        {word.map((char, i) => (
          <span
            key={i}
            className={
              i < 4
                ? "bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent"
                : "bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(96,165,250,0.4)]"
            }
            style={{
              display: "inline-block",
              animation: `splash-letter-in 0.5s var(--ease-spring) ${0.55 + i * 0.05}s both`,
            }}
          >
            {char}
          </span>
        ))}
      </h1>

      {/* Progress dots ala iOS */}
      <div className="mt-5 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-white/40"
            style={{
              animation: `splash-dot 1.1s var(--ease-ios) ${i * 0.15}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
