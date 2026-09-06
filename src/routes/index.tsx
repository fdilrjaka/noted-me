import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Download,
  FileText,
  Palette,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { BrandMark } from "@/components/noteme/BrandMark";
import { Sidebar } from "@/components/noteme/Sidebar";
import { SyncStatus } from "@/components/noteme/SyncEngine";
import { HueSlider } from "@/components/HueSlider";
import { useBackgroundHue } from "@/hooks/use-background-hue";
import { useSession } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { exportBackupJson, exportBackupMarkdown, importBackupJson } from "@/lib/noteme/backup";
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
    ],
  }),
  component: Dashboard,
});

const lastModifiedFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatLastModified(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return lastModifiedFormatter.format(d);
}

export function Dashboard() {
  const data = useData();
  const navigate = useNavigate();
  const { user } = useSession();
  const { hue, setHue } = useBackgroundHue();
  const profileMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const profileAvatarUrl =
    typeof profileMeta["avatar_url"] === "string" ? (profileMeta["avatar_url"] as string) : null;
  const profileAvatarColor =
    typeof profileMeta["avatar_color"] === "string"
      ? (profileMeta["avatar_color"] as string)
      : "#7c3aed";
  const profileNickname =
    typeof profileMeta["nickname"] === "string" ? (profileMeta["nickname"] as string) : "";
  const profileUsername = user?.email?.replace("@noteme.app", "") ?? "";
  const profileInitial = (profileNickname.trim() || profileUsername.trim())[0]?.toUpperCase() ?? "?";
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
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

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    const count = selected.size;
    selected.forEach((id) => deleteSubject(id));
    toast.success(
      count > 1 ? `${count} mata kuliah dipindahkan ke trash` : "Mata kuliah dipindahkan ke trash",
    );
    exitSelectMode();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const result = await importBackupJson(file);
      toast.success(
        `Dipulihkan: ${result.subjects} mata kuliah, ${result.pages} catatan${
          result.images ? `, ${result.images} gambar` : ""
        }`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan cadangan");
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <main
      ref={(el) => {
        mainRef.current = el;
        registerNavDragTarget(el);
      }}
      className="min-h-dvh w-full safe-top safe-bottom-lg"
    >
      <Sidebar />
      <div className="md:ml-[16.5rem]">
        <div className="mx-auto w-full max-w-5xl px-4">
          <header className="flex items-center justify-between gap-3 py-4">
            <div>
              <BrandMark className="text-2xl" />
              <div className="mt-0.5">
                <SyncStatus />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setColorPickerOpen((v) => !v)}
                  aria-label="Ganti warna latar"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Palette className="size-4" />
                </button>
                {colorPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setColorPickerOpen(false)} />
                    <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-64 rounded-2xl p-4">
                      <HueSlider hue={hue} onChange={setHue} />
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  aria-label="Ekspor cadangan"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Download className="size-4" />
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl p-1">
                      <button
                        onClick={() => {
                          void exportBackupJson().then(() => {
                            toast.success("Cadangan JSON diunduh");
                          });
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Cadangan JSON</p>
                      </button>
                      <button
                        onClick={() => {
                          exportBackupMarkdown();
                          toast.success("Cadangan Markdown diunduh");
                          setExportOpen(false);
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
                      >
                        <p className="font-medium">Cadangan Markdown</p>
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button
                        disabled={importBusy}
                        onClick={() => {
                          setExportOpen(false);
                          importInputRef.current?.click();
                        }}
                        className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input disabled:opacity-60"
                      >
                        <p className="font-medium">
                          {importBusy ? "Memulihkan…" : "Impor cadangan JSON"}
                        </p>
                      </button>
                    </div>
                  </>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {subjects.length > 0 && (
                  <button
                    onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                    aria-label="Hapus mata kuliah"
                    className={`press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90 ${
                      selectMode ? "text-destructive" : ""
                    }`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button
                  aria-label="Cari"
                  className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Search className="size-4" />
                </button>
                <button
                  aria-label="Notifikasi"
                  className="press glass-floating relative flex size-10 items-center justify-center rounded-full active:scale-90"
                >
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
                </button>
                <Link
                  to="/auth"
                  aria-label="Akun"
                  className="press flex size-10 items-center justify-center overflow-hidden rounded-full active:scale-90"
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Foto profil"
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-full items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: profileAvatarColor }}
                    >
                      {profileInitial}
                    </span>
                  )}
                </Link>
              </div>
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

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {selectMode ? `${selected.size} dipilih` : "Mata Kuliah"}
              </h2>
              <div className="flex items-center gap-2">
                {selectMode && (
                  <button
                    onClick={exitSelectMode}
                    className="press flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium active:scale-95"
                  >
                    Batal
                  </button>
                )}
                {!selectMode && (
                  <button
                    onClick={() => setAdding(true)}
                    aria-label="Tambah mata kuliah"
                    className="press glass-fab flex size-11 items-center justify-center rounded-full text-foreground/95 active:scale-90"
                  >
                    <Plus className="glass-fab-icon size-5" strokeWidth={2.25} />
                  </button>
                )}
              </div>
            </div>

            {subjects.length === 0 && !adding && (
              <div className="glass-card spring-in mt-6 rounded-3xl p-10 text-center">
                <BookOpen className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Belum ada mata kuliah</p>
              </div>
            )}

            {adding && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setAdding(false)}
              >
                <div
                  className="glass-card spring-in w-full max-w-sm rounded-3xl p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-3 text-base font-semibold">Mata kuliah baru</p>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (name.trim()) createSubject(name);
                        setName("");
                        setAdding(false);
                      }
                      if (e.key === "Escape") setAdding(false);
                    }}
                    placeholder="Contoh: Manajemen Risiko"
                    className="glass-input w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setName("");
                        setAdding(false);
                      }}
                      className="press rounded-full px-4 py-2 text-sm font-medium text-muted-foreground active:scale-95"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (name.trim()) createSubject(name);
                        setName("");
                        setAdding(false);
                      }}
                      className="press rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground active:scale-95"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Mata Kuliah Disesuaikan dengan UI Gambar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => {
                const pages = subjectPages(data, subject.id);
                const isSelected = selected.has(subject.id);
                const lastModifiedIso = pages.reduce(
                  (latest, p) => (p.updated_at > latest ? p.updated_at : latest),
                  subject.updated_at,
                );

                return (
                  <div
                    key={subject.id}
                    onClick={() =>
                      selectMode ? toggleSelected(subject.id) : openSubject(subject.id, pages[0]?.id)
                    }
                    className={`press glass-card spring-in group relative flex flex-col justify-between cursor-pointer rounded-xl p-4 transition-all ${
                      isSelected ? "ring-2 ring-destructive" : ""
                    }`}
                  >
                    {selectMode && (
                      <div
                        className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border bg-background/50"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    )}

                    <div>
                      <div className="flex items-start gap-2.5">
                        <FileText className="mt-0.5 size-4 flex-none text-muted-foreground/70" />
                        <p className="line-clamp-1 text-sm font-semibold tracking-wide text-foreground">
                          {subject.name}
                        </p>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-muted-foreground/80">
                        {pages.length} pertemuan
                      </p>
                    </div>

                    <div className="mt-4 pl-6 text-[11px] text-muted-foreground/60">
                      Last modified:{" "}
                      <span className="font-normal">{formatLastModified(lastModifiedIso)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {selectMode && selected.size > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <button
                onClick={deleteSelected}
                className="press glass-floating flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground shadow-2xl active:scale-95"
              >
                <Trash2 className="size-4" /> Hapus {selected.size} mata kuliah
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
