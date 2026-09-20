import { createFileRoute } from "@tanstack/react-router";
import { TodoPage } from "@/features/todo";

export const Route = createFileRoute("/todo")({
  head: () => ({
    meta: [
      { title: "To Do List — NoteMe" },
      {
        name: "description",
        content: "Project, tugas kuliah, dan task lain per kategori & section.",
      },
    ],
  }),
  component: TodoPage,
});
