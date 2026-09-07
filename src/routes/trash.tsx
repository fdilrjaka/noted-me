import { createFileRoute } from "@tanstack/react-router";
import { TrashPage } from "@/features/trash";

export const Route = createFileRoute("/trash")({
  head: () => ({
    meta: [
      { title: "Trash — NoteMe" },
      {
        name: "description",
        content: "Pulihkan atau hapus permanen mata kuliah dan halaman pertemuan yang dibuang.",
      },
      { property: "og:title", content: "Trash — NoteMe" },
      {
        property: "og:description",
        content: "Kelola catatan NoteMe yang dibuang: pulihkan atau hapus permanen.",
      },
    ],
  }),
  component: TrashPage,
});
