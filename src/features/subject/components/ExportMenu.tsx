import { Download } from "lucide-react";
import type { useExportMenu } from "../hooks/useExportMenu";

export function ExportMenu({
  pageId,
  menu,
}: {
  pageId: string;
  menu: ReturnType<typeof useExportMenu>;
}) {
  const { exportOpen, setExportOpen, exportJson, exportMarkdown, exportPdf } = menu;

  return (
    <div className="relative">
      <button
        aria-label="Ekspor pertemuan ini"
        onClick={() => setExportOpen((v) => !v)}
        className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
      >
        <Download className="size-3.5" />
      </button>
      {exportOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
          <div className="glass-card spring-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl p-1">
            <button
              onClick={() => exportJson(pageId)}
              className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
            >
              <p className="font-medium">Ekspor JSON</p>
              <p className="text-xs text-muted-foreground">Lengkap, bisa dipulihkan lagi</p>
            </button>
            <button
              onClick={() => exportMarkdown(pageId)}
              className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
            >
              <p className="font-medium">Ekspor Markdown</p>
              <p className="text-xs text-muted-foreground">Teks saja, mudah dibaca</p>
            </button>
            <button
              onClick={() => exportPdf(pageId)}
              className="press-sm w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-input"
            >
              <p className="font-medium">Ekspor PDF</p>
              <p className="text-xs text-muted-foreground">Langsung ke-download</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
