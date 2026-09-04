import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import {
  emptyTrash,
  purgePage,
  purgeSubject,
  restorePage,
  restoreSubject,
  trashItems,
  useData,
} from "@/lib/noteme/store";

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

function TrashPage() {
  const data = useData();
  const { subjects, pages } = trashItems(data);
  const empty = subjects.length === 0 && pages.length === 0;

  return (
    <main
      ref={registerNavDragTarget}
      className="mx-auto min-h-dvh w-full max-w-3xl px-4 safe-top safe-bottom-lg md:pl-[16.5rem]"
    >
      <Sidebar />
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label="Kembali"
          className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-lg font-bold tracking-tight">Trash</h1>
        {!empty && (
          <button
            onClick={() => {
              emptyTrash();
              toast.success("Trash dikosongkan");
            }}
            className="press rounded-full border border-border px-4 py-2 text-sm active:scale-95"
          >
            Kosongkan
          </button>
        )}
      </header>

      {empty && (
        <div className="glass-card spring-in mt-6 rounded-3xl p-10 text-center">
          <Trash2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Trash kosong</p>
        </div>
      )}

      <div className="space-y-2">
        {subjects.map((s) => (
          <div
            key={s.id}
            className="glass-card glass-card-press spring-in flex items-center gap-3 rounded-2xl px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">Mata Kuliah</p>
            </div>
            <button
              aria-label="Pulihkan"
              onClick={() => restoreSubject(s.id)}
              className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              aria-label="Hapus permanen"
              onClick={() => purgeSubject(s.id)}
              className="press-sm flex size-9 items-center justify-center rounded-full bg-input text-destructive active:scale-90"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {pages.map((p) => (
          <div
            key={p.id}
            className="glass-card glass-card-press spring-in flex items-center gap-3 rounded-2xl px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {data.subjects.find((s) => s.id === p.subject_id)?.name ?? "Pertemuan"}
              </p>
            </div>
            <button
              aria-label="Pulihkan"
              onClick={() => restorePage(p.id)}
              className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              aria-label="Hapus permanen"
              onClick={() => purgePage(p.id)}
              className="press-sm flex size-9 items-center justify-center rounded-full bg-input text-destructive active:scale-90"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
