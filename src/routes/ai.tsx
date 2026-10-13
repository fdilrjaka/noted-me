import { createFileRoute } from "@tanstack/react-router";
import { AiPage } from "@/features/ai";
import "@/features/ai/ai-prose.css";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Chat — NoteMe" },
      {
        name: "description",
        content: "Tanya AI soal catatanmu: lampirkan file, gambar, atau halaman catatan.",
      },
    ],
  }),
  component: AiPage,
});
