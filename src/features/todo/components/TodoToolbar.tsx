import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlignJustify,
  Check,
  Info,
  LayoutGrid,
  Paperclip,
  Settings,
  SquarePen,
  Tag,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { QuickAddPopover, type QuickAddTarget } from "./QuickAddPopover";

/** board = grid kolom, list = daftar vertikal, project = per kategori/proyek, schedule = timeline. */
export type TodoView = "board" | "list" | "project" | "schedule";
export type TodoFilter = "all" | "active" | "done" | "overdue";
export type TodoSort = "manual" | "deadline" | "progress" | "tag";

export type TodoStats = { total: number; done: number; overdue: number; avgProgress: number };
export type TagCount = { tag: string; count: number };

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Belum selesai" },
  { id: "done", label: "Selesai" },
  { id: "overdue", label: "Terlambat" },
];

const SORTS: { id: TodoSort; label: string }[] = [
  { id: "manual", label: "Urutan manual" },
  { id: "deadline", label: "Deadline terdekat" },
  { id: "progress", label: "Progress tertinggi" },
  { id: "tag", label: "Berdasarkan tag" },
];

const btn =
  "press-sm flex size-9 items-center justify-center rounded-xl text-foreground/75 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 sm:size-10";
const btnActive = "bg-black/[0.07] text-foreground dark:bg-white/15";

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
    >
      {children}
      {active && <Check className="size-4 text-primary" />}
    </button>
  );
}

export function TodoToolbar({
  view,
  onView,
  editMode,
  onEditMode,
  filter,
  onFilter,
  tags,
  tagFilter,
  onToggleTag,
  sort,
  onSort,
  stats,
  onClearDone,
  onReset,
  quickAddTargets,
  quickAddDefault,
}: {
  view: TodoView;
  onView: (v: TodoView) => void;
  editMode: boolean;
  onEditMode: (on: boolean) => void;
  filter: TodoFilter;
  onFilter: (f: TodoFilter) => void;
  tags: TagCount[];
  tagFilter: string[];
  onToggleTag: (tag: string) => void;
  sort: TodoSort;
  onSort: (s: TodoSort) => void;
  stats: TodoStats;
  onClearDone: () => void;
  onReset: () => void;
  quickAddTargets: QuickAddTarget[];
  quickAddDefault: string;
}) {
  const gridish = view === "board" || view === "list";
  const filtering = filter !== "all" || tagFilter.length > 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex justify-center px-3 md:bottom-6">
      <nav
        aria-label="Task Management"
        className="pointer-events-auto relative flex items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
      >
        <span className="pointer-events-none absolute -top-3 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/90 px-3 py-0.5 text-[11px] font-semibold shadow-sm dark:border-white/10 dark:bg-slate-900/90 sm:block">
          Task Management
        </span>

        {/* 1. Task Grid View — ganti antara tampilan grid (kolom) dan daftar. */}
        <button
          type="button"
          aria-label="Task Grid View"
          title={
            view === "board"
              ? "Grid aktif — klik untuk tampilan daftar"
              : view === "list"
                ? "Daftar aktif — klik untuk tampilan grid"
                : "Tampilan grid"
          }
          aria-pressed={gridish}
          onClick={() => onView(view === "board" ? "list" : "board")}
          className={`${btn} ${gridish ? btnActive : ""}`}
        >
          <LayoutGrid className="size-5" />
        </button>

        {/* 5. Quick Add Task — buat task baru seketika. */}
        <QuickAddPopover
          targets={quickAddTargets}
          defaultTarget={quickAddDefault}
          trigger={
            <button
              type="button"
              aria-label="Quick Add Task"
              title="Quick add task"
              className={btn}
            >
              <SquarePen className="size-5" />
            </button>
          }
        />

        {/* 2. Project View — kelompokkan task per proyek/kategori. */}
        <button
          type="button"
          aria-label="Project View"
          title="Tampilan proyek (kelompokkan per kategori)"
          aria-pressed={view === "project"}
          onClick={() => onView(view === "project" ? "board" : "project")}
          className={`${btn} ${view === "project" ? btnActive : ""}`}
        >
          <AlignJustify className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Hapus task selesai"
          title="Hapus semua task selesai"
          disabled={stats.done === 0}
          onClick={onClearDone}
          className={`${btn} disabled:pointer-events-none disabled:opacity-40`}
        >
          <Trash2 className="size-5" />
        </button>

        {/* 3. Schedule & Deadlines — timeline berdasarkan tanggal. */}
        <button
          type="button"
          aria-label="Schedule & Deadlines"
          title="Jadwal & deadline (timeline)"
          aria-pressed={view === "schedule"}
          onClick={() => onView(view === "schedule" ? "board" : "schedule")}
          className={`${btn} ${view === "schedule" ? btnActive : ""}`}
        >
          <Paperclip className="size-5" />
        </button>

        {/* 4. Task Tags — filter berdasarkan tag & status. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Task Tags"
              title="Filter tag & status"
              className={`${btn} ${filtering ? btnActive : ""}`}
            >
              <Tag className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            sideOffset={14}
            className="max-h-[60vh] w-64 overflow-y-auto rounded-2xl p-2"
          >
            <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">Status</p>
            {FILTERS.map((f) => (
              <Choice key={f.id} active={filter === f.id} onClick={() => onFilter(f.id)}>
                {f.label}
              </Choice>
            ))}
            <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">Tag</p>
            {tags.length === 0 ? (
              <p className="px-3 pb-2 text-xs text-muted-foreground">
                Belum ada tag. Tambahkan lewat edit task.
              </p>
            ) : (
              tags.map(({ tag, count }) => (
                <Choice
                  key={tag}
                  active={tagFilter.includes(tag.toLowerCase())}
                  onClick={() => onToggleTag(tag)}
                >
                  <span>
                    #{tag} <span className="text-muted-foreground">· {count}</span>
                  </span>
                </Choice>
              ))
            )}
          </PopoverContent>
        </Popover>

        {/* Urutan (termasuk berdasarkan tag) & pengaturan tampilan. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Pengaturan tampilan"
              title="Urutkan & pengaturan"
              className={`${btn} ${sort !== "manual" || editMode ? btnActive : ""}`}
            >
              <Settings className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={14} className="w-60 rounded-2xl p-2">
            <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">Urutkan</p>
            {SORTS.map((s) => (
              <Choice key={s.id} active={sort === s.id} onClick={() => onSort(s.id)}>
                {s.label}
              </Choice>
            ))}
            <div className="my-1.5 border-t border-slate-200/80 dark:border-white/10" />
            <Choice active={editMode} onClick={() => onEditMode(!editMode)}>
              Tombol hapus di kartu
            </Choice>
            <Choice active={false} onClick={onReset}>
              Reset filter & urutan
            </Choice>
            <Link
              to="/settings"
              className="flex w-full items-center rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Pengaturan aplikasi
            </Link>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Info" title="Ringkasan" className={btn}>
              <Info className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={14} className="w-56 rounded-2xl p-4">
            <p className="text-sm font-semibold">Ringkasan</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total task</dt>
                <dd className="tabular-nums">{stats.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Selesai</dt>
                <dd className="tabular-nums">{stats.done}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Terlambat</dt>
                <dd className="tabular-nums text-destructive">{stats.overdue}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rata-rata progress</dt>
                <dd className="tabular-nums">{stats.avgProgress}%</dd>
              </div>
            </dl>
          </PopoverContent>
        </Popover>
      </nav>
    </div>
  );
}
