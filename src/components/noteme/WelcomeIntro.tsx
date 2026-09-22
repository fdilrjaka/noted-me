import { useEffect, useState } from "react";

const TEXT = "Welcome!";
// Durasi ngetik + jeda baca sebelum mulai animasi "masuk" ke aplikasi.
const TYPE_MS = 1100;
const HOLD_MS = 700;
const EXIT_MS = 600;

/**
 * Layar sapaan "Welcome!" dengan animasi mengetik, di atas pola kanvas tak terbatas yang sama
 * dengan halaman login. Muncul menimpa Dashboard (yang sudah dirender di baliknya), lalu
 * memudar + membesar sedikit untuk kesan "masuk ke dalam aplikasi" sebelum memanggil onDone.
 */
export function WelcomeIntro({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const toExit = setTimeout(() => setExiting(true), TYPE_MS + HOLD_MS);
    const finish = setTimeout(onDone, TYPE_MS + HOLD_MS + EXIT_MS);
    return () => {
      clearTimeout(toExit);
      clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
      style={{
        backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        transition: `opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.12)" : "scale(1)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 15% 20%, var(--glow-green), transparent 70%), " +
            "radial-gradient(ellipse 50% 50% at 90% 80%, var(--glow-blue), transparent 70%)",
          opacity: 0.5,
        }}
      />

      <h1
        className="relative border-r-[3px] border-foreground pr-2 text-5xl font-bold tracking-tight text-foreground sm:text-6xl"
        style={{
          width: `${TEXT.length}ch`,
          overflow: "hidden",
          whiteSpace: "nowrap",
          animation: `noteme-welcome-typing ${TYPE_MS}ms steps(${TEXT.length}, end), noteme-welcome-caret 0.75s step-end infinite`,
        }}
      >
        {TEXT}
      </h1>
    </div>
  );
}
