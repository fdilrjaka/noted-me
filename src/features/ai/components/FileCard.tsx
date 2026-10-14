import { ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { downloadName, FORMAT_LABEL, type FileSpec } from "../lib/fileSpec";

function detail(spec: FileSpec): string {
  if (spec.format === "xlsx") {
    const rows = spec.sheets.reduce((n, s) => n + s.rows.length, 0);
    return `${FORMAT_LABEL.xlsx} · ${spec.sheets.length} lembar · ${rows} baris`;
  }
  return `${FORMAT_LABEL[spec.format]} · ${spec.content.length.toLocaleString("id-ID")} karakter`;
}

type Props = { spec: FileSpec; active: boolean; onOpen: () => void };

/** Kartu file di dalam jawaban. Menekannya membuka panel kanan (pratinjau, edit, unduh). */
export function FileCard({ spec, active, onOpen }: Props) {
  const Icon = spec.format === "xlsx" ? FileSpreadsheet : FileText;
  const name = downloadName(spec);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      aria-label={`Buka ${name}`}
      className={`press-sm flex w-full max-w-md items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
      }`}
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={name}>
          {name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{detail(spec)}</span>
      </span>
      <span className="flex flex-none items-center gap-0.5 text-xs font-medium text-muted-foreground">
        {active ? "Terbuka" : "Buka"}
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}
