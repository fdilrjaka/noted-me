import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Pin, PinOff, Plus, Search, Trash2, User, X } from "lucide-react";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { useSession } from "@/hooks/useSession";
import {
  activeSubjects,
  createSubject,
  deleteSubject,
  patchSubject,
  search,
  subjectPages,
  useData,
} from "@/lib/noteme/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoteMe — Catatan Mata Kuliah" },
      {
        name: "description",
        content:
          "Dashboard NoteMe: semua mata kuliah dan catatan per pertemuan, bisa dipakai offline dan tersinkron otomatis.",
      },
      { property: "og:title", content: "NoteMe — Catatan Mata Kuliah" },
      {
        property: "og:description",
        content: "Catatan kuliah offline-first dengan halaman pertemuan, pencarian, pin, dan trash.",
      },
    ],
  }),
  component: Dashboard,
});

const colorGlow: Record<string, string> = {
  blue: "from-glow-blue/40",
  purple: "from-glow-purple/40",
  pink: "from-glow-pink/40",
  teal: "from-glow-blue/30",
  amber: "from-glow-pink/30",
};

function Dashboard() {
  const data = useData();
  const navigate = useNavigate();
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const subjects = useMemo(() => activeSubjects(data), [data]);
  const hits = useMemo(() => search(data, query), [data, query]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-24 safe-top">
      <header className="flex items-center justify-between gap-3 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NoteMe</h1>
          <div className="mt-0.5">
            <SyncStatus />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/trash"
            aria-label="Trash"
            className="press glass flex size-10 items-center justify-center rounded-full active:scale-90"
          >
            <Trash2 className="size-4" />
          </Link>
          <Link
            to="/auth"
            aria-label="Akun"
            className="press glass flex size-10 items-center justify-center rounded-full active:scale-90"
          >
            <User className="size-4" />
          </Link>
        </div>
      </header>

      <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3">
        <Search className="size-4 flex-none text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di semua catatan…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Hapus pencarian" className="press-sm">
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {query ? (
        <section className="mt-4 space-y-2">
          {hits.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk “{query}”.
            </p>
          )}
          {hits.map((hit) => (
            <button
              key={hit.page.id}
              onClick={() =>
                navigate({
                  to: "/subject/$subjectId",
                  params: { subjectId: hit.page.subject_id },
                  search: { page: hit.page.id },
                })
              }
              className="press glass spring-in block w-full rounded-2xl px-4 py-3 text-left active:scale-[0.98]"
            >
              <p className="text-xs text-muted-foreground">{hit.subject?.name}</p>
              <p className="font-semibold">{hit.page.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.snippet}</p>
            </button>
          ))}
        </section>
      ) : (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Mata Kuliah
            </h2>
            <button
              onClick={() => setAdding(true)}
              className="press flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
            >
              <Plus className="size-4" /> Tambah
            </button>
          </div>

          {subjects.length === 0 && !adding && (
            <div className="glass spring-in mt-6 rounded-3xl p-10 text-center">
              <BookOpen className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">Belum ada mata kuliah</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan mata kuliah pertamamu, halaman Pertemuan 1 dibuat otomatis.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const pages = subjectPages(data, subject.id);
              return (
                <div
                  key={subject.id}
                  className="press glass spring-in relative overflow-hidden rounded-3xl p-4 hover:scale-[1.01]"
                >
                  <div
                    className={`pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-gradient-to-br ${colorGlow[subject.color] ?? colorGlow["blue"]} to-transparent blur-2xl`}
                  />
                  <Link
                    to="/subject/$subjectId"
                    params={{ subjectId: subject.id }}
                    search={{ page: pages[0]?.id }}
                    className="relative block"
                  >
                    <p className="pr-16 text-lg leading-tight font-semibold">{subject.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pages.length} pertemuan
                      {subject.pinned ? " · disematkan" : ""}
                    </p>
                  </Link>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      aria-label={subject.pinned ? "Lepas sematan" : "Sematkan"}
                      onClick={() => patchSubject(subject.id, { pinned: !subject.pinned })}
                      className="press-sm flex size-8 items-center justify-center rounded-full bg-input active:scale-90"
                    >
                      {subject.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                    </button>
                    <button
                      aria-label="Pindahkan ke trash"
                      onClick={() => deleteSubject(subject.id)}
                      className="press-sm flex size-8 items-center justify-center rounded-full bg-input active:scale-90"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!user && (
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Catatan tersimpan di perangkat ini.{" "}
          <Link to="/auth" className="text-primary underline">
            Masuk
          </Link>{" "}
          untuk sinkronisasi otomatis.
        </p>
      )}

      {adding && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-background/60 p-3 backdrop-blur-sm sm:items-center">
          <div className="glass sheet-up w-full max-w-md rounded-3xl p-5 safe-bottom">
            <h3 className="text-lg font-semibold">Mata Kuliah baru</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Contoh: Basis Data"
              className="mt-4 w-full rounded-2xl bg-input px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setAdding(false);
                  setName("");
                }}
                className="press flex-1 rounded-full border border-border py-2.5 text-sm font-medium active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={submit}
                className="press flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  function submit() {
    if (!name.trim()) return;
    const id = createSubject(name);
    setName("");
    setAdding(false);
    void navigate({
      to: "/subject/$subjectId",
      params: { subjectId: id },
      search: { page: undefined },
    });
  }
}
