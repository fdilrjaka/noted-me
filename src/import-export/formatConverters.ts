import { getData, stripHtml } from "@/storage/local/dataCore";
import { collectImagesForPages, downloadBlob, escapeHtml, slugify, stamp } from "./shared";

/**
 * Export satu pertemuan/page sebagai file PDF yang langsung ke-download —
 * bukan lewat dialog print. Content di-render off-screen (gambar `idb:<id>`
 * diganti data URL base64 dulu lewat collectImagesForPages), di-"foto" pakai
 * html2canvas, lalu potongan gambarnya ditempel ke halaman-halaman jsPDF
 * (dipotong per tinggi halaman kalau kontennya panjang) dan langsung di-save().
 */
export async function exportPagePdf(pageId: string) {
  const data = getData();
  const page = data.pages.find((p) => p.id === pageId && !p.deleted);
  if (!page) return;
  const subject = data.subjects.find((s) => s.id === page.subject_id);
  const images = await collectImagesForPages([page]);

  let content = page.content || "";
  for (const [id, img] of Object.entries(images)) {
    content = content.split(`idb:${id}`).join(`data:${img.contentType};base64,${img.base64}`);
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Render di container off-screen (bukan display:none, biar html2canvas tetap bisa
  // ngukur layout-nya) dengan lebar tetap supaya hasil render konsisten dari sisi manapun.
  const RENDER_WIDTH = 794; // ~ A4 @ 96dpi
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = `${RENDER_WIDTH}px`;
  container.style.background = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.color = "#111111";
  container.innerHTML = `
    <h1 style="font-size:22px;margin:0 0 4px;">${escapeHtml(page.title || "Catatan")}</h1>
    <p style="color:#666;font-size:12px;margin:0 0 24px;">
      ${subject ? `${escapeHtml(subject.name)} · ` : ""}Diekspor ${escapeHtml(new Date().toLocaleString("id-ID"))}
    </p>
    <div style="line-height:1.55;">${content || "<p><em>(kosong)</em></p>"}</div>
  `;
  const images_ = container.querySelectorAll("img");
  images_.forEach((img) => {
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
  });
  document.body.appendChild(container);

  try {
    // Tunggu semua <img> di container selesai load, biar gak ke-capture kosong/putus.
    await Promise.all(
      Array.from(images_).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
      ),
    );

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        // Jangan ikut-ikutan meng-clone stylesheet global: Tailwind v4 pakai warna
        // oklch()/color-mix() yang bikin html2canvas throw di sebagian browser.
        ignoreElements: (el) => el.tagName === "STYLE" || el.tagName === "LINK",
      });
    } catch {
      canvas = null;
    }

    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const imgWidth = pageWidth;
      // Kalau kontennya lebih tinggi dari satu halaman, potong canvas jadi beberapa
      // halaman PDF berturut-turut (masing-masing setinggi satu halaman A4).
      const pageHeightOnCanvas = (pageHeight * canvas.width) / imgWidth;
      let renderedHeight = 0;
      let first = true;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageHeightOnCanvas, canvas.height - renderedHeight);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight,
          );
        }
        const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
        if (!first) pdf.addPage();
        pdf.addImage(
          sliceCanvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          0,
          0,
          imgWidth,
          sliceImgHeight,
        );
        renderedHeight += sliceHeight;
        first = false;
      }
    } else {
      // Fallback teks: kalau screenshot HTML gagal (browser lama / warna CSS modern),
      // PDF tetap dibuat dari teks catatan supaya tombol ekspor tidak pernah "diam".
      const margin = 48;
      let y = margin;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(page.title || "Catatan", margin, y);
      y += 22;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        `${subject ? `${subject.name} · ` : ""}Diekspor ${new Date().toLocaleString("id-ID")}`,
        margin,
        y,
      );
      y += 24;
      pdf.setFontSize(11);
      const body = stripHtml(page.content) || "(kosong)";
      for (const line of pdf.splitTextToSize(body, pageWidth - margin * 2) as string[]) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 16;
      }
    }

    downloadBlob(`noteme-${slugify(page.title)}-${stamp()}.pdf`, pdf.output("blob"));
  } finally {
    container.remove();
  }
}
