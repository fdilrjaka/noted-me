import { useState } from "react";
import { toast } from "sonner";
import { exportPageJson, exportPageMarkdown } from "@/import-export/backupExport";
import { exportPagePdf } from "@/import-export/formatConverters";

/** State dropdown "Ekspor pertemuan ini" + tiga aksi ekspornya. */
export function useExportMenu() {
  const [exportOpen, setExportOpen] = useState(false);

  const exportJson = (pageId: string) => {
    void exportPageJson(pageId).then(() => {
      toast.success("Pertemuan diekspor sebagai JSON");
    });
    setExportOpen(false);
  };

  const exportMarkdown = (pageId: string) => {
    exportPageMarkdown(pageId);
    toast.success("Pertemuan diekspor sebagai Markdown");
    setExportOpen(false);
  };

  const exportPdf = (pageId: string) => {
    setExportOpen(false);
    const t = toast.loading("Menyiapkan PDF…");
    void exportPagePdf(pageId)
      .then(() => {
        toast.success("Pertemuan diekspor sebagai PDF", { id: t });
      })
      .catch((err: unknown) => {
        console.error(err);
        toast.error("Gagal membuat PDF, coba lagi", { id: t });
      });
  };

  return { exportOpen, setExportOpen, exportJson, exportMarkdown, exportPdf };
}
