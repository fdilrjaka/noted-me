import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlignJustify,
  Check,
  Filter,
  Info,
  LayoutGrid,
  Package,
  Settings,
  SquarePen,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

export type TodoView = "board" | "list";
export type TodoFilter = "all" | "active" | "done" | "overdue";
export type TodoSort = "manual" | "deadline" | "progress";

export type TodoStats = { total: number; done: number; overdue: number; avgProgress: number };

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: "all", label: "Semua task" },
  { id: "active", label: "Belum selesai" },
  { id: "done", label: "Selesai" },
  { id: "overdue", label: "Terlambat" },
];

const SORTS: { id: TodoSort; label: string }[] = [
  { id: "manual", label: "Urutan manual" },
  { id: "deadline", label: "Deadline terdekat" },
  { id: "progress", label: "Progress tertinggi" },
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
  sort,
  onSort,
  stats,
  doneCount,
  onClearDone,
}: {
  view: TodoView;
  onView: (v: TodoView) => void;
  editMode: boolean;
  onEditMode: (on: boolean) => void;
  filter: TodoFilter;
  onFilter: (f: TodoFilter) => void;
  sort: TodoSort;
  onSort: (s: TodoSort) => void;
  stats: TodoStats;
  doneCount: number;
  onClearDone: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex justify-center px-3 md:bottom-6">
      <nav
        aria-label="Alat To Do List"
        className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
      >
        <button
          type="button"
          aria-label="Tampilan board"
          title="Tampilan board"
          aria-pressed={view === "board"}
          onClick={() => onView("board")}
          className={`${btn} ${view === "board" ? btnActive : ""}`}
        >
          <LayoutGrid className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Mode edit"
          title="Mode edit (hapus task langsung dari kartu)"
          aria-pressed={editMode}
          onClick={() => onEditMode(!editMode)}
          className={`${btn} ${editMode ? btnActive : ""}`}
        >
          <SquarePen className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Tampilan daftar"
          title="Tampilan daftar"
          aria-pressed={view === "list"}
          onClick={() => onView("list")}
          className={`${btn} ${view === "list" ? btnActive : ""}`}
        >
          <AlignJustify className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Hapus task selesai"
          title="Hapus semua task selesai"
          disabled={doneCount === 0}
          onClick={onClearDone}
          className={`${btn} disabled:pointer-events-none disabled:opacity-40`}
        >
          <Trash2 className="size-5" />
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Filter"
              title="Filter"
              className={`${btn} ${filter !== "all" ? btnActive : ""}`}
            >
              <Filter className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={14} className="w-52 rounded-2xl p-1.5">
            {FILTERS.map((f) => (
              <Choice key={f.id} active={filter === f.id} onClick={() => onFilter(f.id)}>
                {f.label}
              </Choice>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Urutkan"
              title="Urutkan"
              className={`${btn} ${sort !== "manual" ? btnActive : ""}`}
            >
              <Package className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={14} className="w-52 rounded-2xl p-1.5">
            {SORTS.map((s) => (
              <Choice key={s.id} active={sort === s.id} onClick={() => onSort(s.id)}>
                {s.label}
              </Choice>
            ))}
          </PopoverContent>
        </Popover>

        <Link to="/settings" aria-label="Pengaturan" title="Pengaturan" className={btn}>
          <Settings className="size-5" />
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Info" title="Ringkasan" className={btn}>
              <Info className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={14} className="w-56 rounded-2xl p-4">
            <p className="text-sm font-semibold">Ringkasan kategori ini</p>
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
