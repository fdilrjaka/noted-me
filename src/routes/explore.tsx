import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckSquare, NotebookText, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [{ title: "Explore — NoteMe" }],
  }),
  component: Explore,
});

const destinations = [
  {
    to: "/" as const,
    title: "Notes",
    description: "Catatan per mata kuliah, tersimpan per pertemuan.",
    icon: NotebookText,
  },
  {
    to: "/todo" as const,
    title: "To Do List",
    description: "Project, tugas kuliah, dan task lain — dibagi per kategori & section.",
    icon: CheckSquare,
  },
];

function Explore() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem]">
      <header className="flex items-center justify-between gap-3 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        <Link
          to="/trash"
          aria-label="Trash"
          className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
        >
          <Trash2 className="size-4" />
        </Link>
      </header>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {destinations.map(({ to, title, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="press glass-card spring-in flex flex-col gap-3 rounded-3xl p-5"
          >
            <div className="glass-floating flex size-11 items-center justify-center rounded-2xl">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
