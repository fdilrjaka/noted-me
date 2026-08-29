import { useEffect, useRef, useState } from "react";
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
  Palette,
  Quote,
  Table,
  Underline,
  X,
} from "lucide-react";

type Props = {
  pageId: string;
  initialContent: string;
  onChange: (html: string) => void;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

async function fileToDataUrl(file: File): Promise<string> {
  const bitmapUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  // Downscale large photos so notes stay light and offline-friendly.
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      if (scale === 1) return resolve(bitmapUrl);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(bitmapUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(bitmapUrl);
    img.src = bitmapUrl;
  });
}

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

/** Bikin HTML tabel baru sesuai jumlah baris & kolom yang dipilih user. */
function buildTableHtml(rows: number, cols: number) {
  const headerCells = Array.from({ length: cols }, (_, i) => `<th>Kolom ${i + 1}</th>`).join("");
  const bodyRows = Array.from(
    { length: Math.max(rows - 1, 1) },
    () => `<tr>${Array.from({ length: cols }, () => "<td><br></td>").join("")}</tr>`,
  ).join("");
  return `<table><colgroup>${Array.from({ length: cols }, () => "<col />").join("")}</colgroup><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;
}

/** Pastikan setiap tabel di dalam note (baik baru disisipkan, di-paste, atau lama) punya
 * colgroup dengan lebar eksplisit + handle drag di tiap kolom biar bisa di-resize manual. */
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

/** Bersihin tabel hasil copy-paste dari luar (Excel/Sheets/Word): buang style & tag
 * bawaan mereka, sisain struktur tabelnya aja biar konsisten sama tabel bikinan sendiri. */
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

export function Editor({ pageId, initialContent, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panel, setPanel] = useState<"none" | "highlight" | "bg" | "table">("none");
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [bg, setBg] = useState<"default" | "white">("default");
  const resizing = useRef<{ col: HTMLTableColElement; startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialContent || "";
    setSaved(true);
    setPanel("none");
    try {
      const savedBg = window.localStorage.getItem(`noteme.bg.${pageId}`);
      setBg(savedBg === "white" ? "white" : "default");
    } catch {
      setBg("default");
    }
    if (ref.current) enhanceTables(ref.current);
    // Load content only when switching pages, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const flush = () => {
    if (!ref.current) return;
    onChange(ref.current.innerHTML);
    setSaved(true);
  };

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
    ref.current?.focus();
    exec("insertHTML", html);
    if (ref.current) enhanceTables(ref.current);
    handleInput();
  };

  const insertImage = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    insertHtml(`<img src="${url}" alt="Gambar catatan" />`);
  };

  const changeBg = (next: "default" | "white") => {
    setBg(next);
    try {
      window.localStorage.setItem(`noteme.bg.${pageId}`, next);
    } catch {
      /* storage full or blocked, opsi warna tetap jalan untuk sesi ini */
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

  // Drag-resize kolom tabel: mousedown di handle -> update lebar <col> pas mouse gerak.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Selain tabel, biarkan perilaku paste bawaan browser (teks/format lain tetap normal).
  };

  const tools = [
    { icon: Heading1, label: "Judul", run: () => exec("formatBlock", "h1") },
    { icon: Heading2, label: "Subjudul", run: () => exec("formatBlock", "h2") },
    { icon: Bold, label: "Tebal", run: () => exec("bold") },
    { icon: Italic, label: "Miring", run: () => exec("italic") },
    { icon: Underline, label: "Garis bawah", run: () => exec("underline") },
    { icon: List, label: "Daftar", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Daftar angka", run: () => exec("insertOrderedList") },
    {
      icon: CheckSquare,
      label: "Checklist",
      run: () =>
        insertHtml(
          '<ul data-checklist="1"><li><input type="checkbox" /><span>Tugas baru</span></li></ul>',
        ),
    },
    { icon: Quote, label: "Kutipan", run: () => exec("formatBlock", "blockquote") },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass-bar sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto rounded-2xl border px-2 py-1.5">
        {tools.map(({ icon: Icon, label, run }) => (
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
          title="Highlight"
          aria-label="Highlight"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPanel((p) => (p === "highlight" ? "none" : "highlight"))}
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
        >
          <Highlighter className="size-4" />
        </button>

        <button
          type="button"
          title="Warna latar catatan"
          aria-label="Warna latar catatan"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPanel((p) => (p === "bg" ? "none" : "bg"))}
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
        >
          <Palette className="size-4" />
        </button>

        <button
          type="button"
          title="Tabel"
          aria-label="Tabel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPanel((p) => (p === "table" ? "none" : "table"))}
          className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
        >
          <Table className="size-4" />
        </button>

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
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-bg={bg}
        onInput={handleInput}
        onBlur={flush}
        onPaste={handlePaste}
        onFocus={() => setPanel("none")}
        data-placeholder="Mulai menulis catatan…"
        className="note-content min-h-[60vh] flex-1 px-1 py-5"
      />

      {panel !== "none" && (
        <div
          className="fade-in-ios fixed inset-0 z-40 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
          onMouseDown={() => setPanel("none")}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="glass spring-in w-full max-w-xs rounded-3xl border p-4 shadow-lg"
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
                  Setelah disisipkan, tarik garis tipis di sisi kanan tiap kolom untuk atur lebarnya
                  manual. Tabel yang di-copy dari luar (mis. Excel/Sheets) juga bisa langsung
                  di-paste.
                </p>
              </>
            )}
          </div>
        </div>
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
    </div>
  );
}
