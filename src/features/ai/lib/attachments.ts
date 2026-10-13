/**
 * Membaca file/gambar/catatan jadi lampiran chat. Semuanya jalan di browser, tanpa backend.
 * pdfjs-dist dan mammoth di-import dinamis: berat, dan tidak boleh disentuh saat SSR.
 */
import { LIMITS } from "./wire";
import type { AiAttachment } from "../types";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 80;
const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 0.85;

export const ACCEPT_ATTR = [
  "image/*",
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".html",
  ".htm",
  ".log",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".sql",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".sh",
].join(",");

const TEXT_EXT = new Set(
  "txt md markdown csv tsv json xml html htm log yaml yml toml ini sql js ts tsx jsx py java c cpp cs go rs php rb sh".split(
    " ",
  ),
);
const IMAGE_EXT = new Set("png jpg jpeg webp gif bmp heic heif avif".split(" "));
const UNSUPPORTED_OFFICE = new Set("doc xls xlsx ppt pptx odt ods odp rtf".split(" "));

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function textAttachment(kind: "text" | "note", name: string, raw: string): AiAttachment {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) {
    throw new Error(
      kind === "note"
        ? `Halaman "${name}" masih kosong.`
        : `Tidak ada teks yang bisa dibaca di "${name}". PDF hasil scan belum didukung; kirim sebagai gambar.`,
    );
  }
  const truncated = cleaned.length > LIMITS.maxAttachmentChars;
  return {
    id: newId(),
    kind,
    name,
    text: truncated ? cleaned.slice(0, LIMITS.maxAttachmentChars) : cleaned,
    truncated,
  };
}

export function noteAttachment(name: string, text: string): AiAttachment {
  return textAttachment("note", name, text);
}

/**
 * Pustaka berat (pdfjs, mammoth) hanya boleh dimuat di browser. Ternary dengan
 * `import.meta.env.SSR` (diganti literal saat build) membuat bundler membuang `import()`-nya
 * dari bundle server Worker, jadi ukuran Worker tidak membengkak.
 */
async function extractPdf(file: File): Promise<string> {
  // Build "legacy" supaya jalan di Safari/iOS yang lebih lama.
  const pdfjs = import.meta.env.SSR ? null : await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = import.meta.env.SSR
    ? null
    : await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  if (!pdfjs || !worker) throw new Error("Hanya tersedia di browser.");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  try {
    const parts: string[] = [];
    let chars = 0;
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let n = 1; n <= pages && chars <= LIMITS.maxAttachmentChars; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if ("str" in item) pageText += item.str + (item.hasEOL ? "\n" : " ");
      }
      parts.push(pageText);
      chars += pageText.length;
    }
    return parts.join("\n\n");
  } finally {
    void task.destroy();
  }
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = import.meta.env.SSR ? null : await import("mammoth");
  if (!mammoth) throw new Error("Hanya tersedia di browser.");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function readImage(file: File): Promise<AiAttachment> {
  const failure = new Error(
    `"${file.name}" tidak bisa dibuka browser ini. Ubah ke JPG atau PNG lalu coba lagi.`,
  );
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file);
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } catch {
        bitmap = null;
        throw failure;
      }
    } else {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await img.decode().catch(() => {
        throw failure;
      });
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    }
    if (!width || !height) throw failure;

    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw failure;
    // JPEG tidak punya transparansi: alasi putih supaya PNG transparan tidak jadi hitam.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
    if (dataUrl.length > LIMITS.maxImageChars) {
      throw new Error(`"${file.name}" masih terlalu besar setelah dikompres.`);
    }
    return { id: newId(), kind: "image", name: file.name, dataUrl };
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Baca satu file jadi lampiran. Melempar Error dengan pesan yang siap ditampilkan ke user. */
export async function readAttachment(file: File): Promise<AiAttachment> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" lebih dari 15 MB.`);
  const ext = extOf(file.name);

  if (file.type.startsWith("image/") || IMAGE_EXT.has(ext)) return readImage(file);

  if (ext === "pdf" || file.type === "application/pdf") {
    try {
      return textAttachment("text", file.name, await extractPdf(file));
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Tidak ada teks")) throw err;
      throw new Error(`"${file.name}" tidak bisa dibaca. Pastikan PDF tidak diproteksi password.`);
    }
  }

  if (ext === "docx") {
    try {
      return textAttachment("text", file.name, await extractDocx(file));
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Tidak ada teks")) throw err;
      throw new Error(`"${file.name}" tidak bisa dibaca sebagai DOCX.`);
    }
  }

  if (UNSUPPORTED_OFFICE.has(ext)) {
    throw new Error(
      `Format .${ext} belum didukung. Simpan sebagai PDF, DOCX, atau CSV lalu unggah lagi.`,
    );
  }

  if (file.type.startsWith("text/") || file.type === "application/json" || TEXT_EXT.has(ext)) {
    return textAttachment("text", file.name, await file.text());
  }

  throw new Error(`Format ${ext ? `.${ext}` : "file ini"} belum didukung.`);
}

/** Cek apakah lampiran baru masih muat dalam batas satu pesan. Mengembalikan pesan galat atau null. */
export function checkAddable(current: AiAttachment[], next: AiAttachment): string | null {
  if (current.length >= LIMITS.maxAttachments) {
    return `Maksimal ${LIMITS.maxAttachments} lampiran per pesan.`;
  }
  if (
    next.kind === "image" &&
    current.filter((a) => a.kind === "image").length >= LIMITS.maxImages
  ) {
    return `Maksimal ${LIMITS.maxImages} gambar per pesan.`;
  }
  const used = current.reduce((sum, a) => sum + (a.text?.length ?? 0), 0);
  if (used + (next.text?.length ?? 0) > LIMITS.maxAttachmentCharsPerMessage) {
    return "Total teks lampiran terlalu panjang. Kirim sebagian dulu, atau hapus lampiran lain.";
  }
  return null;
}
