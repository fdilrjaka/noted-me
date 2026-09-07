// Fungsi-fungsi murni yang memanipulasi DOM editor secara langsung — sengaja
// dipisah dari Editor.tsx karena tidak menyentuh state React sama sekali
// (semuanya cuma terima elemen/string, balikin elemen/string). Dipakai bareng
// oleh komponen Editor untuk: exec command formatting, insert HTML di cursor,
// kompresi gambar sebelum upload, enhance tabel & gambar (resize handle), dan
// serialize isi editor sebelum disimpan (termasuk urusan idb:<id> vs blob URL).
import { resolveImageSrc } from "@/lib/noteme/imageResolver";

export function exec(command: string, value?: string) {
  try {
    // Safari never implemented hiliteColor — it needs backColor instead.
    if (
      command === "hiliteColor" &&
      typeof document.queryCommandSupported === "function" &&
      !document.queryCommandSupported("hiliteColor")
    ) {
      document.execCommand("backColor", false, value);
      return;
    }
    document.execCommand(command, false, value);
  } catch {
    // execCommand is deprecated and some engines throw instead of no-op — never crash the editor for it.
  }
}

// document.execCommand("insertHTML", ...) is notoriously unreliable on Safari/mobile Safari
// (silently no-ops or drops formatting). Insert nodes directly via the Range API instead, which
// works consistently across browsers and doesn't depend on a deprecated command.
export function insertHtmlAtCursor(container: HTMLElement, html: string) {
  container.focus();
  const selection = window.getSelection();
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  if (!lastNode) return;

  let range: Range | null = null;
  if (selection && selection.rangeCount > 0) {
    const existing = selection.getRangeAt(0);
    if (container.contains(existing.commonAncestorContainer)) range = existing;
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(container);
    range.collapse(false); // fall back to end of content
  }

  range.deleteContents();
  range.insertNode(fragment);

  const after = document.createRange();
  after.setStartAfter(lastNode);
  after.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(after);
}

// Resize + compress ke JPEG, dan selalu digambar ulang lewat canvas (bukan cuma saat
// gambarnya lebih besar dari batas) supaya ukuran filenya konsisten kecil sebelum diupload.
export async function fileToCompressedBlob(file: File): Promise<Blob> {
  const bitmapUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unsupported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("gagal kompres gambar"))),
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => reject(new Error("gagal membaca gambar"));
    img.src = bitmapUrl;
  });
}

// Upload ke Supabase Storage sekarang murni tanggung jawab sync.ts (dipicu otomatis lewat
// dirty flag di NoteImage, bukan dipanggil manual dari sini) — lihat imageResolver.ts &
// sync.ts untuk alurnya.

export const HIGHLIGHT_COLORS = [
  { label: "Kuning", value: "#fde047" },
  { label: "Hijau", value: "#86efac" },
  { label: "Biru", value: "#93c5fd" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Ungu", value: "#d8b4fe" },
  { label: "Oranye", value: "#fdba74" },
];

export const BG_OPTIONS = [
  { label: "Bawaan", value: "default" },
  { label: "Putih", value: "white" },
] as const;

export function buildTableHtml(rows: number, cols: number) {
  const headerCells = Array.from({ length: cols }, (_, i) => `<th>Kolom ${i + 1}</th>`).join("");
  const bodyRows = Array.from(
    { length: Math.max(rows - 1, 1) },
    () => `<tr>${Array.from({ length: cols }, () => "<td><br></td>").join("")}</tr>`,
  ).join("");
  return `<table><colgroup>${Array.from({ length: cols }, () => "<col />").join("")}</colgroup><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;
}

export function enhanceTables(root: HTMLElement) {
  root.querySelectorAll("table").forEach((table) => {
    const el = table as HTMLTableElement;
    const firstRow = el.querySelector("tr");
    if (!firstRow) return;
    const cells = Array.from(firstRow.children) as HTMLElement[];
    if (cells.length === 0) return;

    let colgroup = el.querySelector("colgroup");
    if (!colgroup || colgroup.children.length !== cells.length) {
      colgroup?.remove();
      colgroup = document.createElement("colgroup");
      const total = el.getBoundingClientRect().width || cells.length * 120;
      cells.forEach((cell) => {
        const col = document.createElement("col");
        const width = cell.getBoundingClientRect().width || total / cells.length;
        col.style.width = `${Math.max(48, Math.round(width))}px`;
        colgroup!.appendChild(col);
      });
      el.prepend(colgroup);
    }

    cells.forEach((cell, i) => {
      if (i === cells.length - 1) return;
      if (cell.querySelector(":scope > .col-resize-handle")) return;
      const handle = document.createElement("span");
      handle.className = "col-resize-handle";
      handle.contentEditable = "false";
      handle.dataset["colIndex"] = String(i);
      cell.appendChild(handle);
    });
  });
}

export function sanitizeTableHtml(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return null;
  table.querySelectorAll("colgroup, col").forEach((n) => n.remove());
  table.querySelectorAll("*").forEach((node) => {
    node.removeAttribute("style");
    node.removeAttribute("class");
    node.removeAttribute("width");
    node.removeAttribute("height");
    node.removeAttribute("bgcolor");
  });
  table.removeAttribute("style");
  table.removeAttribute("class");
  return `${table.outerHTML}<p><br></p>`;
}

// Bungkus tiap <img> yang belum punya wrapper dengan <span class="img-resize-wrap"> +
// handle di pojok kanan-bawah, biar bisa diklik lalu diresize (pola yang sama kayak
// enhanceTables di atas — wrapper & handle-nya memang ikut tersimpan ke content, bukan
// cuma dekorasi sementara, biar lebar gambar yang sudah diatur tetap kepakai lagi
// setelah reload/sync ke device lain).
export function enhanceImages(root: HTMLElement) {
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (img.closest(".img-resize-wrap")) return;
    const wrap = document.createElement("span");
    wrap.className = "img-resize-wrap";
    wrap.contentEditable = "false";
    img.replaceWith(wrap);
    wrap.appendChild(img);
    const handle = document.createElement("span");
    handle.className = "img-resize-handle";
    handle.contentEditable = "false";
    wrap.appendChild(handle);
    // Tombol hapus terpisah dari resize handle — sebelumnya satu-satunya cara
    // menghapus gambar adalah lewat tombol Backspace/Delete di keyboard, yang
    // ternyata gak konsisten kejadiannya di semua browser desktop (kadang gak
    // ke-trigger sama sekali kalau elemen yang "dipilih" cuma lewat class CSS,
    // bukan Selection/Range asli milik browser). Tombol eksplisit ini jalan sama
    // di HP maupun laptop.
    const del = document.createElement("span");
    del.className = "img-resize-delete";
    del.contentEditable = "false";
    del.setAttribute("role", "button");
    del.setAttribute("aria-label", "Hapus gambar");
    del.textContent = "×";
    wrap.appendChild(del);
  });
}

export function deselectImages(root: HTMLElement) {
  root
    .querySelectorAll(".img-resize-wrap.is-selected")
    .forEach((el) => el.classList.remove("is-selected"));
}

export const IDB_SRC_PREFIX = "idb:";
export const RETRY_DELAY_MS = 1500;

// PENTING: "idb:<id>" adalah satu-satunya referensi permanen ke gambar di IndexedDB —
// ini yang WAJIB tersimpan di content (localStorage/Supabase), bukan blob URL.
// Blob URL (dari URL.createObjectURL) cuma valid sepanjang sesi tab ini masih hidup;
// begitu di-revoke (ganti halaman) atau browser/tab ditutup, blob URL itu langsung mati.
//
// Jadi kita SIMPAN id asli di attribute terpisah `data-idb-id` yang tidak pernah disentuh
// lagi setelah resolve, dan `img.src` cuma dipakai buat tampilan sementara (blob URL).
// Saat mau disimpan (lihat serializeContent), src selalu ditulis ulang balik ke
// "idb:<id>" dari data-idb-id — supaya blob URL yang bersifat sementara itu TIDAK PERNAH
// ikut ke-persist ke content yang disimpan.
//
// Scan semua <img> yang masih pakai src="idb:<id>" ATAU sudah punya data-idb-id (misal
// sudah pernah di-resolve tapi container di-render ulang) yang belum sempat di-resolve
// (belum punya atribut data-resolving="1"), resolve satu-satu secara async lewat
// imageResolver — tidak memblokir render awal, gambar boleh muncul belakangan sesaat
// dengan opacity redup sebagai placeholder. Kalau resolve gagal (race condition: row
// note_images-nya belum sempat sync), retry sekali lagi setelah jeda singkat.
export function resolvePendingImages(container: HTMLElement, attempt = 0) {
  const imgs = container.querySelectorAll<HTMLImageElement>(
    `img[src^="${IDB_SRC_PREFIX}"]:not([data-resolving="1"]), img[data-idb-id]:not([data-resolving="1"])`,
  );
  imgs.forEach((img) => {
    const id = img.dataset["idbId"] ?? img.getAttribute("src")?.slice(IDB_SRC_PREFIX.length);
    if (!id) return;
    img.dataset["idbId"] = id; // pastikan id asli selalu tersimpan di attribute permanen
    img.dataset["resolving"] = "1";
    img.style.opacity = "0.4";
    void resolveImageSrc(id).then((src) => {
      if (!img.isConnected) return;
      if (src) {
        img.src = src; // cuma buat tampilan — id asli tetap aman di data-idb-id
        img.style.opacity = "";
        img.removeAttribute("data-resolving");
      } else if (attempt < 3) {
        // Belum ketemu (kemungkinan race condition baru sync) — coba lagi sebentar lagi.
        img.dataset["resolving"] = "0";
        setTimeout(() => resolvePendingImages(container, attempt + 1), RETRY_DELAY_MS);
      } else {
        img.style.opacity = "";
        img.alt = "Gambar tidak ditemukan";
      }
    });
  });
}

// Dipanggil sebelum content disimpan (flush). Kloning container (biar DOM asli yang lagi
// ditampilkan ke user tidak diutak-atik), lalu untuk tiap <img data-idb-id> tulis ulang
// src-nya balik jadi "idb:<id>" — apapun src tampilannya sekarang (blob:, atau bahkan
// masih idb: kalau belum sempat di-resolve). Ini kunci fix-nya: blob URL sementara TIDAK
// PERNAH ikut tersimpan ke content, jadi gambar tidak akan "hilang" referensinya lagi
// setelah reload / ganti device.
export function serializeContent(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLImageElement>("img[data-idb-id]").forEach((img) => {
    const id = img.getAttribute("data-idb-id");
    if (id) img.setAttribute("src", `${IDB_SRC_PREFIX}${id}`);
    img.removeAttribute("data-resolving");
    img.style.opacity = "";
  });
  clone
    .querySelectorAll(".img-resize-wrap.is-selected")
    .forEach((el) => el.classList.remove("is-selected"));
  clone
    .querySelectorAll(".img-resize-handle.is-resizing")
    .forEach((el) => el.classList.remove("is-resizing"));
  return clone.innerHTML;
}
