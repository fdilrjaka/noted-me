import { Link } from "@tanstack/react-router";
import { ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { Sidebar } from "@/components/noteme/Sidebar";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { trashItems, useData } from "@/storage/local/dataCore";
import { emptyTrash, purgePage, restorePage } from "@/storage/local/pageStore";
import { purgeSubject, restoreSubject } from "@/storage/local/subjectStore";
import { TrashItemRow } from "./components/TrashItemRow";

export function TrashPage() {
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
          <TrashItemRow
            key={s.id}
            title={s.name}
            subtitle="Mata Kuliah"
            onRestore={() => restoreSubject(s.id)}
            onPurge={() => purgeSubject(s.id)}
          />
        ))}
        {pages.map((p) => (
          <TrashItemRow
            key={p.id}
            title={p.title}
            subtitle={data.subjects.find((s) => s.id === p.subject_id)?.name ?? "Pertemuan"}
            onRestore={() => restorePage(p.id)}
            onPurge={() => purgePage(p.id)}
          />
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
