import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Camera,
  CheckSquare,
  Heading1,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Palette,
  PenTool,
  Quote,
  Table,
  Type,
  Underline,
  X,
} from "lucide-react";
import { DrawingCanvas } from "./DrawingCanvas";
import { putImage } from "@/lib/noteme/imageStore";
import { resolveImageSrc, revokeAllResolved } from "@/lib/noteme/imageResolver";
import { registerLocalImage } from "@/lib/noteme/store";

type Props = {
  pageId: string;
  initialContent: string;
  onChange: (html: string) => void;
};

function exec(command: string, value?: string) {
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
function insertHtmlAtCursor(container: HTMLElement, html: string) {
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
async function fileToCompressedBlob(file: File): Promise<Blob> {
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


const HIGHLIGHT_COLORS = [
  { label: "Kuning", value: "#fde047" },
  { label: "Hijau", value: "#86efac" },
  { label: "Biru", value: "#93c5fd" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Ungu", value: "#d8b4fe" },
  { label: "Oranye", value: "#fdba74" },
];

const BG_OPTIONS = [
  { label: "Bawaan", value: "default" },
  { label: "Putih", value: "white" },
] as const;

function buildTableHtml(rows: number, cols: number) {
  const headerCells = Array.from({ length: cols }, (_, i) => `<th>Kolom ${i + 1}</th>`).join("");
  const bodyRows = Array.from(
    { length: Math.max(rows - 1, 1) },
    () => `<tr>${Array.from({ length: cols }, () => "<td><br></td>").join("")}</tr>`,
  ).join("");
  return `<table><colgroup>${Array.from({ length: cols }, () => "<col />").join("")}</colgroup><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;
}

function enhanceTables(root: HTMLElement) {
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

function sanitizeTableHtml(html: string): string | null {
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

const IDB_SRC_PREFIX = "idb:";
const RETRY_DELAY_MS = 1500;

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
function resolvePendingImages(container: HTMLElement, attempt = 0) {
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
function serializeContent(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLImageElement>("img[data-idb-id]").forEach((img) => {
    const id = img.getAttribute("data-idb-id");
    if (id) img.setAttribute("src", `${IDB_SRC_PREFIX}${id}`);
    img.removeAttribute("data-resolving");
    img.style.opacity = "";
  });
  return clone.innerHTML;
}

export function Editor({ pageId, initialContent, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panel, setPanel] = useState<"none" | "highlight" | "bg" | "table">("none");
  const [formatSheetOpen, setFormatSheetOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [bg, setBg] = useState<"default" | "white">("default");
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(
    null,
  );
  const resizing = useRef<{ col: HTMLTableColElement; startX: number; startWidth: number } | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const updateSelectionToolbar = useCallback(() => {
    const root = ref.current;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setSelectionToolbar(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelectionToolbar(null);
      return;
    }
    const toolbarWidth = 236;
    const top = Math.max(8, rect.top - 54);
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2),
      window.innerWidth - toolbarWidth - 8,
    );
    setSelectionToolbar({ top, left });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateSelectionToolbar);
    return () => document.removeEventListener("selectionchange", updateSelectionToolbar);
  }, [updateSelectionToolbar]);

  const toolbarVisible = Boolean(selectionToolbar);
  useEffect(() => {
    if (!toolbarVisible) return;
    const onReposition = () => updateSelectionToolbar();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [toolbarVisible, updateSelectionToolbar]);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialContent || "";
    setSaved(true);
    setPanel("none");
    setSelectionToolbar(null);
    try {
      const savedBg = window.localStorage.getItem(`noteme.bg.${pageId}`);
      setBg(savedBg === "white" ? "white" : "default");
    } catch {
      setBg("default");
    }
    if (ref.current) {
      enhanceTables(ref.current);
      resolvePendingImages(ref.current);
    }
    // Ganti halaman (atau unmount) — object URL yang sudah dibikin resolveImageSrc buat
    // halaman sebelumnya gak dipakai lagi, revoke biar gak numpuk di memory browser.
    return () => revokeAllResolved();
  }, [pageId]);


  const flush = () => {
    if (!ref.current) return;
    onChange(serializeContent(ref.current));
    setSaved(true);
  };

  const hideSelectionToolbar = () => setSelectionToolbar(null);

  const handleInput = () => {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const insertHtml = (html: string) => {
    if (ref.current) {
      insertHtmlAtCursor(ref.current, html);
      enhanceTables(ref.current);
      resolvePendingImages(ref.current);
    }
    handleInput();
  };

  const insertImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await fileToCompressedBlob(file); // tetap dikompres dulu biar IndexedDB gak boros
      const id = await putImage(blob, pageId);
      registerLocalImage(id, pageId);
      // src="idb:<id>" adalah referensi permanen yang disimpan; data-idb-id dipakai
      // resolvePendingImages buat tau id aslinya walau src tampilan sudah diganti blob URL.
      insertHtml(`<img src="idb:${id}" data-idb-id="${id}" alt="Gambar catatan" />`);
    } catch (err) {
      console.error(err);
      window.alert("Gagal menyimpan gambar. Coba lagi.");
    }
  };

  const changeBg = (next: "default" | "white") => {
    setBg(next);
    try {
      window.localStorage.setItem(`noteme.bg.${pageId}`, next);
    } catch {
      //
    }
    setPanel("none");
  };

  const applyHighlight = (color: string | null) => {
    ref.current?.focus();
    exec("hiliteColor", color ?? "transparent");
    handleInput();
    setPanel("none");
  };

  const insertTable = () => {
    const rows = Math.min(Math.max(tableRows, 1), 12);
    const cols = Math.min(Math.max(tableCols, 1), 8);
    insertHtml(buildTableHtml(rows, cols));
    setPanel("none");
  };

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains("col-resize-handle")) return;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      const table = target.closest("table");
      const colIndex = Number(target.dataset["colIndex"] ?? -1);
      if (!cell || !table || colIndex < 0) return;
      const col = table.querySelectorAll("colgroup col")[colIndex] as
        HTMLTableColElement | undefined;
      if (!col) return;
      e.preventDefault();
      target.classList.add("is-resizing");
      resizing.current = { col, startX: e.clientX, startWidth: cell.getBoundingClientRect().width };

      const onMove = (ev: PointerEvent) => {
        if (!resizing.current) return;
        const delta = ev.clientX - resizing.current.startX;
        const next = Math.max(48, Math.round(resizing.current.startWidth + delta));
        resizing.current.col.style.width = `${next}px`;
      };
      const onUp = () => {
        target.classList.remove("is-resizing");
        resizing.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        handleInput();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    container.addEventListener("pointerdown", onPointerDown);
    return () => container.removeEventListener("pointerdown", onPointerDown);
  }, [pageId]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (html && /<table/i.test(html)) {
      const cleaned = sanitizeTableHtml(html);
      if (cleaned) {
        e.preventDefault();
        insertHtml(cleaned);
      }
    }
  };

  const primaryTools = [
    { icon: Bold, label: "Tebal", run: () => exec("bold") },
    { icon: Italic, label: "Miring", run: () => exec("italic") },
    { icon: Underline, label: "Garis bawah", run: () => exec("underline") },
    { icon: List, label: "Daftar", run: () => exec("insertUnorderedList") },
    {
      icon: CheckSquare,
      label: "Checklist",
      run: () =>
        insertHtml(
          '<ul data-checklist="1"><li><input type="checkbox" /><span>Tugas baru</span></li></ul>',
        ),
    },
  ];

  const secondaryTools = [
    { icon: Heading1, label: "Judul", run: () => exec("formatBlock", "h1") },
    { icon: Heading2, label: "Subjudul", run: () => exec("formatBlock", "h2") },
    { icon: ListOrdered, label: "Daftar angka", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Kutipan", run: () => exec("formatBlock", "blockquote") },
  ];

  const toolbarButtons = (
    <>
      <button
        type="button"
        title="Format"
        aria-label="Format"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setFormatSheetOpen(true)}
        className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
      >
        <Type className="size-4" />
      </button>

      <span className="mx-0.5 h-5 w-px flex-none bg-border" aria-hidden="true" />

      {primaryTools.map(({ icon: Icon, label, run }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            ref.current?.focus();
            run();
            handleInput();
          }}
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
        >
          <Icon className="size-4" />
        </button>
      ))}

      <button
        type="button"
        title="Gambar"
        aria-label="Gambar"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
      >
        <ImageIcon className="size-4" />
      </button>

      <button
        type="button"
        title="Tulis tangan"
        aria-label="Tulis tangan"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setPanel("none");
          setFormatSheetOpen(false);
          setDrawOpen(true);
        }}
        className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
      >
        <PenTool className="size-4" />
      </button>

      <button
        type="button"
        title="Kamera"
        aria-label="Kamera"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => cameraRef.current?.click()}
        className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
      >
        <Camera className="size-4" />
      </button>

      <span className="ml-auto flex-none pr-1 text-[11px] text-muted-foreground">
        {saved ? "Tersimpan" : "Menyimpan…"}
      </span>
    </>
  );

  // Toolbar khusus HP: di-portal langsung ke <body>, di luar tree layout note.
  // Ini penting supaya `position: fixed` benar-benar terikat ke viewport (layar HP),
  // bukan ke elemen leluhur mana pun yang mungkin punya transform/animasi —
  // sehingga toolbar jadi layer paling depan yang selalu ikut nempel saat discroll,
  // persis seperti navbar, bukan malah "nempel" ke posisi konten yang lewat.
  // Bentuknya pill mengambang + glass (pakai utility glass-navigation yang sama
  // dipakai BottomNav), biar konsisten ala iOS.
  const mobileToolbar =
    isMobile && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.85rem)]"
            // Portal ini tetap ada di dalam React tree kartu halaman, jadi event
            // sentuh di sini akan tetap bubble ke handler swipe ganti halaman
            // meski secara DOM sudah pindah ke <body>. Stop di sini supaya geser
            // toolbar ke kanan/kiri tidak dibaca sebagai swipe ganti halaman.
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="glass-navigation pointer-events-auto flex w-[95%] max-w-[420px] items-center justify-between gap-1 overflow-x-auto rounded-full px-3 py-2 shadow-2xl">
              {toolbarButtons}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {mobileToolbar}

      {/* Toolbar desktop: sticky di dalam layout normal, dibalikin ke gaya
          glass iOS (glass-toolbar) biar nggak keliatan flat lagi */}
      {!isMobile && (
        <div className="glass-toolbar hidden items-center justify-between gap-1 overflow-x-auto rounded-2xl px-2 py-1 sm:sticky sm:top-2 sm:flex">
          {toolbarButtons}
        </div>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-bg={bg}
        onInput={handleInput}
        onBlur={() => {
          flush();
          hideSelectionToolbar();
        }}
        onPaste={handlePaste}
        onFocus={() => {
          setPanel("none");
          setFormatSheetOpen(false);
        }}
        data-placeholder="Mulai menulis catatan…"
        className="note-content min-h-[60vh] flex-1 px-1 py-5 pb-32" 
      />

      {selectionToolbar &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="toolbar"
            aria-label="Format teks terpilih"
            style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
            className="glass-toolbar spring-in fixed z-50 flex items-center gap-0.5 rounded-2xl px-1.5 py-1.5"
          >
            {primaryTools.map(({ icon: Icon, label, run }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  ref.current?.focus();
                  run();
                  handleInput();
                  updateSelectionToolbar();
                }}
                className="press-sm flex size-8 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
              >
                <Icon className="size-4" />
              </button>
            ))}
            <span className="mx-0.5 h-5 w-px flex-none bg-border" aria-hidden="true" />
            <button
              type="button"
              title="Lainnya"
              aria-label="Opsi format lainnya"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                hideSelectionToolbar();
                setFormatSheetOpen(true);
              }}
              className="press-sm flex size-8 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>,
          document.body,
        )}

      {formatSheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fade-in-ios fixed inset-0 z-40 flex items-end justify-center bg-background/60 backdrop-blur-sm"
            style={{ height: "100dvh" }}
            onMouseDown={() => setFormatSheetOpen(false)}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="glass-sheet sheet-up safe-bottom w-full max-w-md rounded-t-3xl p-4"
            >
              <div className="mx-auto mb-3 h-1 w-10 flex-none rounded-full bg-input" />
              <p className="mb-2 text-sm font-medium">Format</p>

              <div className="grid grid-cols-4 gap-2">
                {secondaryTools.map(({ icon: Icon, label, run }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      ref.current?.focus();
                      run();
                      handleInput();
                      setFormatSheetOpen(false);
                    }}
                    className="press-sm flex flex-col items-center gap-1.5 rounded-2xl bg-input py-3 text-[11px] text-muted-foreground active:scale-95"
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFormatSheetOpen(false);
                    setPanel("highlight");
                  }}
                  className="press-sm flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-muted-foreground hover:bg-input hover:text-foreground"
                >
                  <Highlighter className="size-4" />
                  Highlight
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFormatSheetOpen(false);
                    setPanel("bg");
                  }}
                  className="press-sm flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-muted-foreground hover:bg-input hover:text-foreground"
                >
                  <Palette className="size-4" />
                  Warna latar catatan
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFormatSheetOpen(false);
                    setPanel("table");
                  }}
                  className="press-sm flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-muted-foreground hover:bg-input hover:text-foreground"
                >
                  <Table className="size-4" />
                  Tabel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {panel !== "none" &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fade-in-ios fixed inset-0 z-40 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
            style={{ height: "100dvh" }}
            onMouseDown={() => setPanel("none")}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="glass-sheet spring-in w-full max-w-xs rounded-3xl p-4"
            >
              {panel === "highlight" && (
                <>
                  <p className="mb-3 text-sm font-medium">Highlight</p>
                  <div className="flex flex-wrap gap-2.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHighlight(c.value)}
                        className="size-9 flex-none rounded-full border border-black/10 active:scale-90"
                        style={{ background: c.value }}
                      />
                    ))}
                    <button
                      type="button"
                      title="Hapus highlight"
                      aria-label="Hapus highlight"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyHighlight(null)}
                      className="press-sm flex size-9 flex-none items-center justify-center rounded-full bg-input active:scale-90"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </>
              )}

              {panel === "bg" && (
                <>
                  <p className="mb-3 text-sm font-medium">Warna latar catatan</p>
                  <div className="flex flex-col gap-1.5">
                    {BG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => changeBg(opt.value)}
                        className={`press-sm flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ${
                          bg === opt.value ? "bg-input text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className="size-5 flex-none rounded-full border border-white/15"
                          style={{ background: opt.value === "white" ? "#ffffff" : "var(--card)" }}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {panel === "table" && (
                <>
                  <p className="mb-3 text-sm font-medium">Sisipkan tabel</p>
                  <div className="flex items-center gap-3">
                    <label className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
                      Baris
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={tableRows}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setTableRows(Number(e.target.value) || 1)}
                        className="w-16 rounded-lg bg-input px-2 py-1.5 text-foreground"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
                      Kolom
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={tableCols}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setTableCols(Number(e.target.value) || 1)}
                        className="w-16 rounded-lg bg-input px-2 py-1.5 text-foreground"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={insertTable}
                    className="press-sm mt-3 w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground active:scale-[0.98]"
                  >
                    Sisipkan {tableRows}x{tableCols}
                  </button>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    Setelah disisipkan, tarik garis tipis di sisi kanan tiap kolom untuk atur
                    lebarnya manual. Tabel yang di-copy dari luar (mis. Excel/Sheets) juga bisa
                    langsung di-paste.
                  </p>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void insertImage(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void insertImage(e.target.files?.[0])}
      />

      {drawOpen && (
        <DrawingCanvas
          onCancel={() => setDrawOpen(false)}
          onInsert={(dataUrl) => {
            setDrawOpen(false);
            void (async () => {
              try {
                // dataUrl adalah data: URL lokal — fetch di sini murni operasi lokal
                // browser (bukan network request), jadi aman & instan walau offline.
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const id = await putImage(blob, pageId);
                registerLocalImage(id, pageId);
                insertHtml(
                  `<img src="idb:${id}" data-idb-id="${id}" alt="Tulisan tangan" data-handwriting="1" />`,
                );
              } catch (err) {
                console.error(err);
                window.alert("Gagal menyimpan tulisan tangan. Coba lagi.");
              }
            })();
          }}
        />
      )}
    </div>
  );
}
