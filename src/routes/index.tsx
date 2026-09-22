import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard";
import { RequireSessionOrGuest } from "@/components/noteme/RequireSessionOrGuest";

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
      <Dashboard />
    </RequireSessionOrGuest>
  ),
});
