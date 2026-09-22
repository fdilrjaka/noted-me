import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dashboard } from "@/features/dashboard";
import { RequireSessionOrGuest } from "@/components/noteme/RequireSessionOrGuest";
import { WelcomeIntro } from "@/components/noteme/WelcomeIntro";
import { consumeWelcomeIntroPending } from "@/lib/noteme/welcomeIntro";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoteMe" },
      {
        name: "description",
        content:
          "Dashboard NoteMe: semua mata kuliah dan catatan per pertemuan, bisa dipakai offline dan tersinkron otomatis.",
      },
    ],
  }),
  component: () => (
    <RequireSessionOrGuest>
      <DashboardWithWelcomeIntro />
    </RequireSessionOrGuest>
  ),
});

/**
 * Dashboard tetap dirender dari awal (data langsung sinkron di belakang layar); overlay
 * "Welcome!" cuma dipasang di atasnya begitu flag dari halaman login masih ada, lalu memudar
 * begitu animasi selesai supaya animasi ini murni terasa "masuk ke dalam aplikasi".
 */
function DashboardWithWelcomeIntro() {
  const [showIntro, setShowIntro] = useState(() => consumeWelcomeIntroPending());

  return (
    <>
      <Dashboard />
      {showIntro && <WelcomeIntro onDone={() => setShowIntro(false)} />}
    </>
  );
}
