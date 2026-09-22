import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/canvas";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NoteMe" },
      {
        name: "description",
        content: "Kanvas visual: tautkan To Do List, Jadwal, dan Catatan dalam satu papan.",
      },
    ],
  }),
  component: DashboardPage,
});
