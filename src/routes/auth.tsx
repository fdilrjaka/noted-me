import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — NoteMe" },
      {
        name: "description",
        content:
          "Masuk ke NoteMe dengan username dan password untuk menyinkronkan catatan kuliahmu.",
      },
      { property: "og:title", content: "Masuk — NoteMe" },
      {
        property: "og:description",
        content: "Login sederhana dengan username dan password untuk sinkronisasi catatan NoteMe.",
      },
    ],
  }),
  component: AuthPage,
});
