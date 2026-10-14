import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { sanitizeStoredHtml } from "@/lib/noteme/sanitizeHtml";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { Artifact } from "../lib/artifacts";
import { buildFileBlob } from "../lib/buildFile";
import { exportAs, exportTargets, specToMarkdown, type ExportTarget } from "../lib/exportFile";
import { FORMAT_LABEL, safeFilename, type FileSpec, type SheetCell } from "../lib/fileSpec";
import { renderMarkdown } from "../lib/markdown";
import { SaveToNoteMenu } from "./SaveToNoteMenu";
import { SheetGrid } from "./SheetGrid";

type Tab = "preview" | "edit" | "pdf";

const MIN_W = 360;
const DEFAULT_W = 560;

type Props = {
  artifact: Artifact;
  /** Semua file di percakapan ini (untuk pemilih versi). */
  artifacts: Artifact[];
  /** Versi yang sudah diedit pengguna, kalau ada. */
  edited: FileSpec | undefined;
  chatTitle: string;
  onSelect: (key: string) => void;
  onEdit: (key: string, spec: FileSpec) => void;
  onReset: (key: string) => void;
  onClose: () => void;
};

function tsv(rows: SheetCell[][]): string {
  return rows
    .map((r) => r.map((c) => (c === null ? "" : String(c).replace(/[\t\n]+/g, " "))).join("\t"))
    .join("\n");
}

export function ArtifactPanel({
  artifact,
  artifacts,
  edited,
  chatTitle,
  onSelect,
  onEdit,
  onReset,
  onClose,
}: Props) {
  const spec = edited ?? artifact.spec;
  const [tab, setTab] = useState<Tab>("preview");
  const [sheetIdx, setSheetIdx] = useState(0);
  const [width, setWidth] = useState(DEFAULT_W);
  const [busy, setBusy] = useState<ExportTarget | null>(null);
  const dragRef = useRef(false);

  // Ganti file/versi: kembali ke pratinjau.
  useEffect(() => {
    setTab("preview");
    setSheetIdx(0);
  }, [artifact.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const group = useMemo(
    () => artifacts.filter((a) => a.group === artifact.group),
    [artifacts, artifact.group],
  );
  const Icon = spec.format === "xlsx" ? FileSpreadsheet : FileText;
  const isDoc = spec.format !== "xlsx";
  const sheet = spec.format === "xlsx" ? (spec.sheets[sheetIdx] ?? spec.sheets[0]) : undefined;

  const paperHtml = useMemo(
    () => (spec.format === "xlsx" ? "" : sanitizeStoredHtml(renderMarkdown(specToMarkdown(spec)))),
    [spec],
  );

  // PDF asli: dibuat ulang (debounce) dan ditampilkan di iframe, supaya yang dilihat = yang diunduh.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const content = spec.format === "pdf" ? spec.content : "";
  const specTitle = spec.title;
  useEffect(() => {
    if (tab !== "pdf" || spec.format !== "pdf") return;
    let alive = true;
    let url: string | null = null;
    setPdfError(false);
    const t = setTimeout(() => {
      buildFileBlob({ format: "pdf", filename: "x", title: specTitle, content })
        .then((blob) => {
          if (!alive) return;
          url = URL.createObjectURL(blob);
          setPdfUrl(url);
        })
        .catch(() => alive && setPdfError(true));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
      setPdfUrl(null);
    };
  }, [tab, spec.format, content, specTitle]);

  const patch = (next: FileSpec) => onEdit(artifact.key, next);

  const download = async (target: ExportTarget) => {
    if (busy) return;
    setBusy(target);
    try {
      await exportAs(spec, target, sheetIdx);
    } catch {
      toast.error("Gagal membuat file. Coba minta AI menyusun ulang isinya.");
    } finally {
      setBusy(null);
    }
  };

  const copy = () => {
    const text = spec.format === "xlsx" ? tsv(sheet?.rows ?? []) : specToMarkdown(spec);
    navigator.clipboard
      .writeText(text)
      .then(() =>
        toast.success(spec.format === "xlsx" ? "Lembar disalin (tempel ke Excel)" : "Isi disalin"),
      )
      .catch(() => toast.error("Tidak bisa menyalin. Izinkan akses clipboard."));
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setWidth(
      Math.round(Math.min(window.innerWidth * 0.7, Math.max(MIN_W, window.innerWidth - e.clientX))),
    );
  };
  const endDrag = () => {
    dragRef.current = false;
  };

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`press-sm h-8 rounded-lg px-3 text-xs font-semibold ${
        tab === id
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-foreground/10"
      }`}
    >
      {label}
    </button>
  );

  const actionBtn =
    "press-sm flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-foreground/10 hover:text-foreground";

  return (
    <aside
      aria-label={`Pratinjau ${spec.filename}`}
      style={{ "--ai-panel-w": `${width}px` } as React.CSSProperties}
      className="fixed inset-0 z-50 flex flex-col bg-background md:relative md:inset-auto md:z-auto md:w-[var(--ai-panel-w)] md:flex-none md:border-l md:border-foreground/10"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Ubah lebar panel"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute -left-1 top-0 z-30 hidden h-full w-2 cursor-col-resize touch-none hover:bg-primary/30 md:block"
      />

      <header className="flex items-center gap-2 border-b border-foreground/10 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={`${spec.filename}.${spec.format}`}>
            {spec.filename}.{spec.format}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{FORMAT_LABEL[spec.format]}</span>
            {edited && (
              <span className="rounded bg-primary/15 px-1.5 text-[10px] font-semibold text-foreground">
                Diedit
              </span>
            )}
            {group.length > 1 && (
              <select
                aria-label="Versi file"
                value={artifact.key}
                onChange={(e) => onSelect(e.target.value)}
                className="rounded bg-foreground/5 px-1 py-0.5 text-xs text-foreground"
              >
                {group.map((a) => (
                  <option key={a.key} value={a.key}>
                    Versi {a.version}
                    {a.version === a.versions ? " (terbaru)" : ""}
                  </option>
                ))}
              </select>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel"
          title="Tutup (Esc)"
          className="press-sm flex size-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </header>

      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-foreground/10 px-3 py-1.5"
      >
        {tabBtn("preview", "Pratinjau")}
        {tabBtn("edit", "Edit")}
        {spec.format === "pdf" && tabBtn("pdf", "PDF asli")}
        {edited && (
          <button
            type="button"
            onClick={() => onReset(artifact.key)}
            className={`${actionBtn} ml-auto h-8`}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Kembalikan
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "preview" && isDoc && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-foreground/5 p-3 md:p-5">
            <article
              className="ai-prose ai-paper mx-auto max-w-[44rem] rounded-md bg-white px-6 py-7 text-slate-900 shadow-md md:px-10 md:py-10"
              dangerouslySetInnerHTML={{ __html: paperHtml }}
            />
          </div>
        )}

        {tab === "preview" && sheet && <SheetGrid key={sheetIdx} sheet={sheet} editable={false} />}

        {tab === "edit" && spec.format !== "xlsx" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Nama file
              <input
                value={spec.filename}
                maxLength={80}
                onChange={(e) =>
                  patch({ ...spec, filename: safeFilename(e.target.value, "dokumen") })
                }
                className="min-w-0 flex-1 rounded-lg bg-foreground/5 px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <textarea
              aria-label="Isi dokumen (Markdown)"
              value={spec.content}
              spellCheck={false}
              onChange={(e) => patch({ ...spec, content: e.target.value })}
              className="min-h-0 flex-1 resize-none rounded-xl bg-foreground/5 p-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground">
              Markdown: # judul, **tebal**, *miring*, - daftar, | tabel |. Perubahan ikut terunduh.
            </p>
          </div>
        )}

        {tab === "edit" && sheet && spec.format === "xlsx" && (
          <SheetGrid
            key={`edit-${sheetIdx}`}
            sheet={sheet}
            editable
            onChange={(rows) =>
              patch({
                ...spec,
                sheets: spec.sheets.map((s, i) => (i === sheetIdx ? { ...s, rows } : s)),
              })
            }
          />
        )}

        {tab === "pdf" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {pdfError ? (
              <p className="p-4 text-sm text-destructive">Gagal membuat PDF dari isi ini.</p>
            ) : pdfUrl ? (
              <>
                <iframe
                  title={`PDF ${spec.filename}`}
                  src={pdfUrl}
                  className="min-h-0 flex-1 bg-white"
                />
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border-t border-foreground/10 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" /> Buka di tab baru
                  (sebagian browser HP hanya menampilkan halaman pertama)
                </a>
              </>
            ) : (
              <div
                className="flex flex-1 items-center justify-center text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-5 animate-spin" aria-label="Membuat PDF" />
              </div>
            )}
          </div>
        )}

        {spec.format === "xlsx" && tab !== "pdf" && spec.sheets.length > 1 && (
          <div
            role="tablist"
            aria-label="Lembar"
            className="flex gap-1 overflow-x-auto border-t border-foreground/10 bg-muted/50 px-2 py-1.5"
          >
            {spec.sheets.map((s, i) => (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={i === sheetIdx}
                onClick={() => setSheetIdx(i)}
                className={`press-sm h-7 flex-none rounded-md px-3 text-xs font-medium ${
                  i === sheetIdx
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/10"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-1 border-t border-foreground/10 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
        <div className="flex">
          <button
            type="button"
            onClick={() => void download(spec.format)}
            disabled={busy !== null}
            className="press-sm flex h-9 items-center gap-1.5 rounded-l-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === spec.format ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Unduh
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Unduh sebagai format lain"
                disabled={busy !== null}
                className="press-sm flex h-9 items-center rounded-r-xl border-l border-primary-foreground/25 bg-primary px-2 text-primary-foreground disabled:opacity-60"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              {exportTargets(spec).map((t) => (
                <DropdownMenuItem key={t.target} onSelect={() => void download(t.target)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button type="button" onClick={copy} className={actionBtn}>
          <Copy className="size-3.5" aria-hidden="true" />{" "}
          {spec.format === "xlsx" ? "Salin lembar" : "Salin"}
        </button>
        <SaveToNoteMenu markdown={specToMarkdown(spec)} fallbackTitle={spec.title || chatTitle} />
      </footer>
    </aside>
  );
}
