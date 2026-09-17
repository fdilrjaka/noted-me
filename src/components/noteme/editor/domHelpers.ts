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

const ORDERED_LIST_MARKER = /^(\d{1,3})\.$/;

// Auto-list ala Google Docs/Notion: kalau isi baris sejauh ini PERSIS "1." atau
// "-" (gak ada teks lain sebelumnya) dan user nekan spasi, baris itu diubah
// jadi list beneran (bukan cuma teks), marker-nya dibuang, dan untuk angka
// selain "1." start number-nya ikut disesuaikan (mis. "3. " mulai dari 3).
// Dipanggil dari onKeyDown saat key === " ", SEBELUM spasinya ke-insert —
// return true berarti pemanggil harus preventDefault() spasi tsb.
//
// Sengaja gak pakai document.execCommand("insert(Un)orderedList") — command
// itu gampang ngerusak seleksi/caret kalau dipanggil pas blok-nya kosong
// (persis kondisi di sini setelah marker dihapus), efeknya caret "ilang" dan
// gak bisa ngetik lagi. List-nya dibangun manual lewat DOM API supaya posisi
// caret di dalam <li> yang baru selalu jelas & konsisten di semua browser.
export function tryAutoConvertLineToList(container: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;

  const textBefore = (node.textContent ?? "").slice(0, range.startOffset);
  const orderedMatch = ORDERED_LIST_MARKER.exec(textBefore);
  const isBulletMarker = textBefore === "-";
  if (!orderedMatch && !isBulletMarker) return false;

  // Marker harus satu-satunya isi blok sejauh ini — kalau ada teks lain
  // sebelum "1."/"-" (mis. "abc-"), biarin, jangan diubah jadi list.
  const block = (node.parentElement?.closest("p, div, li, h1, h2, blockquote, td, th") ??
    container) as HTMLElement;
  if (block === container || block.textContent !== textBefore) return false;
  // Udah di dalam list (mis. nulis "1." di dalam <li> yang udah ada) — biarin
  // browser yang urus, jangan di-nest-in list lagi di sini.
  if (block.tagName === "LI") return false;
  if (!block.parentNode) return false;

  const list = document.createElement(orderedMatch ? "ol" : "ul");
  if (orderedMatch) {
    const startNum = Number(orderedMatch[1]);
    if (startNum > 1) list.setAttribute("start", String(startNum));
  }
  const li = document.createElement("li");
  const br = document.createElement("br");
  li.appendChild(br);
  list.appendChild(li);

  block.replaceWith(list);

  const newRange = document.createRange();
  newRange.setStart(li, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  return true;
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
  return dataUrlToCompressedBlob(bitmapUrl);
}

// Sama seperti fileToCompressedBlob, tapi input-nya sudah berupa data URL (dipakai buat
// gambar hasil paste — misalnya rumus matematika dari Google Docs/Word yang selalu masuk
// ke clipboard sebagai <img src="data:..."> raster, bukan file terpisah). Dipisah dari
// fileToCompressedBlob supaya keduanya bisa saling pakai tanpa muter balik ke File dulu.
export async function dataUrlToCompressedBlob(dataUrl: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale) || img.width;
      canvas.height = Math.round(img.height * scale) || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unsupported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("gagal kompres gambar"))),
        "image/png", // PNG, bukan JPEG — rumus/tabel screenshot punya teks tipis & latar
        // transparan yang gampang rusak/blur kena kompresi lossy JPEG.
      );
    };
    img.onerror = () => reject(new Error("gagal membaca gambar"));
    img.src = dataUrl;
  });
}

// Upload ke Supabase Storage sekarang murni tanggung jawab sync.ts (dipicu otomatis lewat
// dirty flag di NoteImage, bukan dipanggil manual dari sini) — lihat imageResolver.ts &
// sync.ts untuk alurnya.

// Grid warna ala color-picker Google Docs (baris abu-abu di atas, lalu 7 baris
// gradasi warna dari terang ke gelap) — dipakai buat panel Highlight biar
// tampilan & pilihannya mirip screenshot referensi user.
export const HIGHLIGHT_COLOR_GRID: string[][] = [
  [
    "#000000",
    "#434343",
    "#666666",
    "#999999",
    "#b7b7b7",
    "#cccccc",
    "#d9d9d9",
    "#efefef",
    "#f3f3f3",
    "#ffffff",
  ],
  [
    "#980000",
    "#ff0000",
    "#ff9900",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#4a86e8",
    "#0000ff",
    "#9900ff",
    "#ff00ff",
  ],
  [
    "#e6b8af",
    "#f4cccc",
    "#fce5cd",
    "#fff2cc",
    "#d9ead3",
    "#d0e0e3",
    "#c9daf8",
    "#cfe2f3",
    "#d9d2e9",
    "#ead1dc",
  ],
  [
    "#dd7e6b",
    "#ea9999",
    "#f9cb9c",
    "#ffe599",
    "#b6d7a8",
    "#a2c4c9",
    "#a4c2f4",
    "#9fc5e8",
    "#b4a7d6",
    "#d5a6bd",
  ],
  [
    "#cc4125",
    "#e06666",
    "#f6b26b",
    "#ffd966",
    "#93c47d",
    "#76a5af",
    "#6d9eeb",
    "#6fa8dc",
    "#8e7cc3",
    "#c27ba0",
  ],
  [
    "#a61c00",
    "#cc0000",
    "#e69138",
    "#f1c232",
    "#6aa84f",
    "#45818e",
    "#3c78d8",
    "#3d85c6",
    "#674ea7",
    "#a64d79",
  ],
  [
    "#85200c",
    "#990000",
    "#b45f06",
    "#bf9000",
    "#38761d",
    "#134f5c",
    "#1155cc",
    "#0b5394",
    "#351c75",
    "#741b47",
  ],
  [
    "#5b0f00",
    "#660000",
    "#783f04",
    "#7f6000",
    "#274e13",
    "#0c343d",
    "#1c4587",
    "#073763",
    "#20124d",
    "#4c1130",
  ],
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
  const rebuilt = rebuildTableAsTemplate(table);
  return rebuilt ? `${rebuilt.outerHTML}<p><br></p>` : null;
}

// Bikin ulang tabel apapun sumbernya (web, Google Docs, Word — yang masing-masing bawa
// struktur & inline style sendiri yang beda-beda dan gampang bikin error/berantakan kalau
// dipertahankan apa adanya) jadi tabel dengan struktur template NoteMe sendiri: cuma teks
// isi tiap sel yang diambil, sisanya (colspan/rowspan/border/warna/merge) sengaja DIBUANG
// dan digantikan grid biasa. Baris pertama otomatis jadi header (<th>), sisanya <td> biasa
// — konsisten dengan bentuk tabel yang dibikin lewat tombol "Sisipkan tabel" di toolbar.
function rebuildTableAsTemplate(table: Element): HTMLTableElement | null {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return null;

  const rowTexts = rows.map((row) =>
    Array.from(row.querySelectorAll("td, th")).map((cell) =>
      (cell.textContent ?? "").replace(/\s+/g, " ").trim(),
    ),
  );
  const cols = Math.max(...rowTexts.map((r) => r.length));
  if (cols === 0) return null;

  const makeCell = (tag: "th" | "td", text: string) => {
    const cell = document.createElement(tag);
    if (text) {
      cell.textContent = text;
    } else {
      cell.appendChild(document.createElement("br"));
    }
    return cell;
  };

  const newTable = document.createElement("table");
  const colgroup = document.createElement("colgroup");
  for (let i = 0; i < cols; i++) colgroup.appendChild(document.createElement("col"));
  newTable.appendChild(colgroup);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (let i = 0; i < cols; i++) headRow.appendChild(makeCell("th", rowTexts[0]?.[i] ?? ""));
  thead.appendChild(headRow);
  newTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (let r = 1; r < rowTexts.length; r++) {
    const tr = document.createElement("tr");
    for (let i = 0; i < cols; i++) tr.appendChild(makeCell("td", rowTexts[r]?.[i] ?? ""));
    tbody.appendChild(tr);
  }
  // Tabel sumber cuma satu baris (cuma header, tanpa body) — tetap kasih satu baris
  // kosong biar strukturnya konsisten sama tabel yang dibikin lewat toolbar.
  if (tbody.children.length === 0) {
    const tr = document.createElement("tr");
    for (let i = 0; i < cols; i++) tr.appendChild(makeCell("td", ""));
    tbody.appendChild(tr);
  }
  newTable.appendChild(tbody);

  return newTable;
}

// Tag yang boleh selamat dari hasil paste (dari web, Google Docs, Word, dll). Semua tag
// lain di-"unwrap" (dibuang tag-nya, isinya tetap dipertahankan) kecuali tag berbahaya/
// tidak berguna di DANGEROUS_TAGS, yang dibuang beserta isinya.
const ALLOWED_PASTE_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "img",
  "table",
  "colgroup",
  "col",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
]);

const DANGEROUS_TAGS = new Set(["script", "style", "meta", "link", "iframe", "object", "embed"]);

// Attribute yang dipertahankan per tag — semua attribute lain (style, class, id, on*,
// data-* bawaan Word/Google Docs, dsb) dibuang. Ini yang bikin hasil paste konsisten
// dengan tampilan NoteMe sendiri, bukan ikut gaya visual dari sumbernya.
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href"],
  img: ["src", "alt"],
  td: ["colspan", "rowspan", "style"],
  th: ["colspan", "rowspan", "style"],
  p: ["style"],
  div: ["style"],
  span: ["style"],
};

function sanitizeInlineStyle(style: string) {
  const allowed = ["text-align", "font-weight", "font-style", "text-decoration"];
  return style
    .split(";")
    .map((x) => x.trim())
    .filter((x) => allowed.some((a) => x.toLowerCase().startsWith(a + ":")))
    .join(";");
}

// Bersihkan HTML hasil copy-paste (dari web, Google Docs, Word, dsb) TANPA membuang
// konten di luar elemen yang jadi fokus (tabel/gambar) — beda dari sanitizeTableHtml
// yang cuma ambil <table>-nya doang dan buang semua teks lain di sekitarnya. Semua
// jenis konten (paragraf, heading, list, tabel, gambar termasuk gambar rumus
// matematika) dipertahankan dalam satu paste, cuma dibersihkan dari style/class/atribut
// berbahaya dan tag yang tidak relevan.
export function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Buang node komentar (termasuk komentar kondisional MSO/Word yang suka nyelip HTML
  // sampah kayak "<!--[if gte mso 9]>...<![endif]-->").
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) comments.push(node as Comment);
  comments.forEach((c) => c.remove());

  const cleanElement = (el: Element) => {
    // querySelectorAll('*') dievaluasi sekali di awal, jadi aman diiterasi walau kita
    // mengubah tree-nya (unwrap/remove) di tengah jalan.
    Array.from(el.querySelectorAll("*")).forEach((node) => {
      const tag = node.tagName.toLowerCase();

      if (DANGEROUS_TAGS.has(tag) || tag.includes(":")) {
        // tag.includes(":") menangkap elemen ber-namespace ala Word (o:p, w:sdt, dst).
        node.remove();
        return;
      }

      if (!ALLOWED_PASTE_TAGS.has(tag)) {
        // Tag tidak dikenal (mis. <font>, custom web component) — buang tag-nya saja,
        // pertahankan isinya supaya teks tidak ikut hilang.
        node.replaceWith(...Array.from(node.childNodes));
        return;
      }

      if (tag === "colgroup" || tag === "col") {
        node.remove();
        return;
      }

      const keep = new Set(ALLOWED_ATTRS[tag] ?? []);
      Array.from(node.attributes).forEach((attr) => {
        if (!keep.has(attr.name)) node.removeAttribute(attr.name);
      });
      if (node.hasAttribute("style")) {
        const cleanedStyle = sanitizeInlineStyle(node.getAttribute("style") ?? "");
        if (cleanedStyle) node.setAttribute("style", cleanedStyle);
        else node.removeAttribute("style");
      }

      // <img> tanpa src valid (http/https/data) tidak berguna dan bisa jadi request
      // pelacakan (tracking pixel) — buang.
      if (tag === "img") {
        const src = node.getAttribute("src") ?? "";
        if (!/^(https?:|data:image\/)/i.test(src)) node.remove();
      }
      if (tag === "a") {
        const href = node.getAttribute("href") ?? "";
        if (/^javascript:/i.test(href)) node.removeAttribute("href");
      }
    });
  };

  // Bangun ulang SEMUA tabel jadi struktur template NoteMe dulu (lihat komentar
  // rebuildTableAsTemplate) — sebelum cleanElement, karena elemen tabel baru ini sudah
  // pasti bersih duluan.
  Array.from(doc.body.querySelectorAll("table")).forEach((table) => {
    const rebuilt = rebuildTableAsTemplate(table);
    if (rebuilt) table.replaceWith(rebuilt);
    else table.remove();
  });

  cleanElement(doc.body);
  return doc.body.innerHTML;
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
