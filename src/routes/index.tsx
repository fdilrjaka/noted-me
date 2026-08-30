import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Pin, PinOff, Plus, Search, Trash2, User, X } from "lucide-react";
import { BottomNav } from "@/components/noteme/BottomNav";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { useSession } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import {
  activeSubjects,
  createSubject,
  deleteSubject,
  patchSubject,
  search,
  subjectPages,
  useData,
} from "@/lib/noteme/store";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

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
        content:
          "Catatan kuliah offline-first dengan halaman pertemuan, pencarian, pin, dan trash.",
      },
    ],
  }),
  component: Dashboard,
});

// Restrained per-subject accent — lives on the icon dot, a small corner
// glow, and the active state, never as a solid card fill (see spec §3).
// Classes are written out in full (not built with string concatenation) so
// Tailwind's static scanner can find every variant used here.
const accent: Record<string, { glow: string; iconBg: string; dot: string }> = {
  blue: { glow: "from-glow-blue/35", iconBg: "bg-glow-blue/20", dot: "bg-glow-blue" },
  purple: { glow: "from-glow-purple/35", iconBg: "bg-glow-purple/20", dot: "bg-glow-purple" },
  pink: { glow: "from-glow-pink/35", iconBg: "bg-glow-pink/20", dot: "bg-glow-pink" },
  teal: { glow: "from-glow-blue/28", iconBg: "bg-glow-blue/20", dot: "bg-glow-blue" },
  amber: { glow: "from-glow-pink/28", iconBg: "bg-glow-pink/20", dot: "bg-glow-pink" },
};

function Dashboard() {
  const data = useData();
  const navigate = useNavigate();
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const mainRef = useRef<HTMLElement | null>(null);

  const subjects = useMemo(() => activeSubjects(data), [data]);
  const hits = useMemo(() => search(data, query), [data, query]);

  const openSubject = (subjectId: string, pageId: string | undefined) => {
    void navigate({
      to: "/subject/$subjectId",
      params: { subjectId },
      search: { page: pageId },
    });
  };

  return (
    <main
      ref={(el) => {
        mainRef.current = el;
        registerNavDragTarget(el);
      }}
      className="mx-auto min-h-dvh w-full max-w-5xl px-4 safe-top safe-bottom-lg"
    >
      <header className="flex items-center justify-between gap-3 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NoteMe</h1>
          <div className="mt-0.5">
            <SyncStatus />
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/trash"
            aria-label="Trash"
            className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
          >
            <Trash2 className="size-4" />
          </Link>
          <Link
            to="/auth"
            aria-label="Akun"
            className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
          >
            <User className="size-4" />
          </Link>
        </div>
      </header>

      <div className="glass-input flex items-center gap-2 rounded-2xl px-4 py-3">
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
              onClick={() => openSubject(hit.page.subject_id, hit.page.id)}
              className="press glass-card glass-card-press spring-in block w-full rounded-2xl px-4 py-3 text-left"
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
            <div className="glass-card spring-in mt-6 rounded-3xl p-10 text-center">
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
              const tone = accent[subject.color] ?? accent["blue"]!;
              return (
                <div
                  key={subject.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSubject(subject.id, pages[0]?.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openSubject(subject.id, pages[0]?.id);
                    }
                  }}
                  onPointerMove={(e) => {
                    if (e.pointerType !== "mouse") return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty(
                      "--px",
                      `${((e.clientX - rect.left) / rect.width) * 100}%`,
                    );
                    e.currentTarget.style.setProperty(
                      "--py",
                      `${((e.clientY - rect.top) / rect.height) * 100}%`,
                    );
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.removeProperty("--px");
                    e.currentTarget.style.removeProperty("--py");
                  }}
                  className="press glass-card glass-card-press spring-in group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl p-4"
                >
                  <div
                    className={`pointer-events-none absolute -top-14 -right-10 size-36 rounded-full bg-gradient-to-br ${tone.glow} to-transparent blur-2xl`}
                  />

                  <div className="relative flex items-start justify-between gap-2">
                    <span
                      className={`flex size-9 flex-none items-center justify-center rounded-2xl ${tone.iconBg}`}
                    >
                      <span className={`size-2.5 rounded-full ${tone.dot}`} />
                    </span>
                    <div className="flex flex-none items-center gap-1">
                      <button
                        aria-label={subject.pinned ? "Lepas sematan" : "Sematkan"}
                        onClick={(e) => {
                          e.stopPropagation();
                          patchSubject(subject.id, { pinned: !subject.pinned });
                        }}
                        className="press-sm flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
                      >
                        {subject.pinned ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5" />
                        )}
                      </button>
                      <button
                        aria-label="Pindahkan ke trash"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubject(subject.id);
                        }}
                        className="press-sm flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="relative mt-3 text-lg leading-tight font-semibold">
                    {subject.name}
                  </p>
                  <p className="relative mt-1 text-sm text-muted-foreground">
                    {pages.length} pertemuan{subject.pinned ? " · disematkan" : ""}
                  </p>
                  <p className="relative mt-0.5 text-xs text-muted-foreground/70">
                    Diubah {relativeTime(subject.updated_at)}
                  </p>

                  <div className="relative mt-4 flex flex-1 items-end justify-end">
                    <span className="flex size-8 items-center justify-center rounded-full bg-input text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground">
                      <ArrowRight className="size-4" />
                    </span>
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
        <div className="fade-in-ios fixed inset-0 z-30 flex items-end justify-center bg-background/60 p-3 backdrop-blur-sm sm:items-center">
          <div className="glass-sheet sheet-up safe-bottom w-full max-w-md rounded-3xl p-5">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-input sm:hidden" />
            <h3 className="text-lg font-semibold">Mata Kuliah baru</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Contoh: Basis Data"
              className="glass-input mt-4 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
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

      <BottomNav />
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
