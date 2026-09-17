import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
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
  PenTool,
  Pipette,
  Plus,
  Quote,
  Table,
  Type,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { DrawingCanvas } from "../DrawingCanvas";
import { TypingIndicator } from "./TypingIndicator";
import { putImage } from "@/storage/local/imageStore";
import { revokeAllResolved } from "@/lib/noteme/imageResolver";
import { registerLocalImage } from "@/storage/local/imageMetaStore";
import { useTypingPresence } from "@/lib/noteme/presence";
import { useSession } from "@/hooks/useSession";
import {
  HIGHLIGHT_COLOR_GRID,
  buildTableHtml,
  dataUrlToCompressedBlob,
  deselectImages,
  enhanceImages,
  enhanceTables,
  exec,
  fileToCompressedBlob,
  insertHtmlAtCursor,
  resolvePendingImages,
  sanitizePastedHtml,
  serializeContent,
  tryAutoConvertLineToList,
} from "./domHelpers";

type Props = {
  pageId: string;
  initialContent: string;
  onChange: (html: string) => void;
};

export function Editor({ pageId, initialContent, onChange }: Props) {
  const { user } = useSession();
  const myProfile = (() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const nickname = typeof meta["nickname"] === "string" ? meta["nickname"].trim() : "";
    return {
      name: nickname || user?.email?.split("@")[0] || "Seseorang",
      avatarUrl: typeof meta["avatar_url"] === "string" ? meta["avatar_url"] : null,
      avatarColor: typeof meta["avatar_color"] === "string" ? meta["avatar_color"] : "#7c3aed",
    };
  })();
  const { typists, notifyTyping } = useTypingPresence(pageId, user ? myProfile : null);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(true);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panel, setPanel] = useState<"none" | "highlight" | "table">("none");
  const [formatSheetOpen, setFormatSheetOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [customHighlights, setCustomHighlights] = useState<string[]>([]);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(
    null,
  );
  const resizing = useRef<{ col: HTMLTableColElement; startX: number; startWidth: number } | null>(
    null,
  );
  const resizingImage = useRef<{ wrap: HTMLElement; startX: number; startWidth: number } | null>(
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

  // Dihitung langsung dari teks di layar (bukan dari `initialContent`/store yang baru
  // ke-update setelah debounce 600ms) supaya angkanya selalu real-time pas user ngetik.
  const updateCounts = useCallback(() => {
    const text = ref.current?.innerText ?? "";
    const trimmed = text.trim();
    setCounts({
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: text.replace(/\n+/g, "").length,
    });
  }, []);

  // Konten terakhir yang KITA sendiri kirim lewat onChange (echo dari flush lokal, atau
  // dari sinkron ulang efek ini sendiri). Dipakai buat bedain "initialContent berubah
  // karena editor lain / sync / resolve konflik" vs "initialContent berubah cuma gaung
  // dari flush kita sendiri" — biar gak salah nyimpulkan ada update lokal yang perlu
  // ditulis ulang ke DOM padahal itu ya kita sendiri.
  const lastKnownContent = useRef(initialContent);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialContent || "";
    lastKnownContent.current = initialContent;
    setSaved(true);
    setPanel("none");
    setSelectionToolbar(null);
    updateCounts();
    if (ref.current) {
      enhanceTables(ref.current);
      enhanceImages(ref.current);
      resolvePendingImages(ref.current);
    }
    // Ganti halaman (atau unmount) — object URL yang sudah dibikin resolveImageSrc buat
    // halaman sebelumnya gak dipakai lagi, revoke biar gak numpuk di memory browser.
    return () => revokeAllResolved();
  }, [pageId, updateCounts]);

  // Halaman yang sama tetap terbuka, tapi `initialContent` berubah dari luar (device lain
  // ngetik & sync masuk, atau dialog konflik baru saja di-resolve). Sebelumnya efek di atas
  // gak jalan lagi karena `pageId` gak berubah, jadi DOM tetap nampilin versi basi sampai
  // user keluar-masuk halaman — dan tiap keystroke berikutnya malah ngirim ulang versi basi
  // itu, bikin konflik baru terus-menerus. Di sini kita follow perubahan itu, tapi cuma
  // kalau bukan gaung dari flush kita sendiri, dan cuma kalau gak ada ketikan lokal yang
  // masih nunggu di-flush (`timer.current`) — biar gak nimpa huruf yang lagi diketik.
  // Kalau user sedang aktif nulis (fokus di editor / baru banget ngetik), rewrite innerHTML
  // bikin caret lompat ke paling atas dan teks yang baru di-paste keliatan "hilang".
  // Jadi update dari luar ditahan di pending, baru dipasang pas editor gak lagi dipakai.
  const isEditing = useRef(false);
  const lastTypedAt = useRef(0);
  const pendingRemote = useRef<string | null>(null);

  const applyRemoteContent = useCallback(
    (html: string) => {
      if (!ref.current) return;
      lastKnownContent.current = html;
      ref.current.innerHTML = html || "";
      updateCounts();
      enhanceTables(ref.current);
      enhanceImages(ref.current);
      resolvePendingImages(ref.current);
      setSaved(true);
    },
    [updateCounts],
  );

  useEffect(() => {
    if (initialContent === lastKnownContent.current) return;
    if (timer.current) return;
    if (!ref.current) return;
    if (isEditing.current || Date.now() - lastTypedAt.current < 3000) {
      pendingRemote.current = initialContent;
      return;
    }
    pendingRemote.current = null;
    applyRemoteContent(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const flush = () => {
    timer.current = null;
    if (!ref.current) return;
    const html = serializeContent(ref.current);
    lastKnownContent.current = html;
    onChange(html);
    setSaved(true);
  };

  const hideSelectionToolbar = () => setSelectionToolbar(null);

  const handleInput = () => {
    setSaved(false);
    updateCounts();
    notifyTyping();
    lastTypedAt.current = Date.now();
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
      enhanceImages(ref.current);
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

  const applyHighlight = (color: string | null) => {
    ref.current?.focus();
    exec("hiliteColor", color ?? "transparent");
    handleInput();
    setPanel("none");
  };

  // Eyedropper native browser (EyeDropper API) — ambil warna dari mana saja di
  // layar, persis tombol pipet di screenshot referensi. Kalau browser gak
  // dukung (mis. Firefox/Safari lama), tombolnya tetap ada tapi disembunyikan
  // lewat pengecekan ini sebelum dipanggil.
  const pickHighlightWithEyedropper = async () => {
    const EyeDropperCtor = (
      window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }
    ).EyeDropper;
    if (!EyeDropperCtor) {
      window.alert(
        "Browser ini belum mendukung color picker. Coba pakai tombol + untuk pilih warna manual.",
      );
      return;
    }
    try {
      const result = await new EyeDropperCtor().open();
      setCustomHighlights((prev) =>
        [result.sRGBHex, ...prev.filter((c) => c !== result.sRGBHex)].slice(0, 10),
      );
      applyHighlight(result.sRGBHex);
    } catch {
      // user batalin pemilihan warna, gak perlu ditindaklanjuti
    }
  };

  const addCustomHighlight = (color: string) => {
    setCustomHighlights((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, 10));
    applyHighlight(color);
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

      if (target.classList.contains("col-resize-handle")) {
        const cell = target.closest("td, th") as HTMLTableCellElement | null;
        const table = target.closest("table");
        const colIndex = Number(target.dataset["colIndex"] ?? -1);
        if (!cell || !table || colIndex < 0) return;
        const col = table.querySelectorAll("colgroup col")[colIndex] as
          HTMLTableColElement | undefined;
        if (!col) return;
        e.preventDefault();
        target.classList.add("is-resizing");
        resizing.current = {
          col,
          startX: e.clientX,
          startWidth: cell.getBoundingClientRect().width,
        };

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
        return;
      }

      if (target.classList.contains("img-resize-delete")) {
        const wrap = target.closest(".img-resize-wrap") as HTMLElement | null;
        if (!wrap) return;
        e.preventDefault();
        wrap.remove();
        handleInput();
        return;
      }

      // Drag handle di pojok gambar yang lagi dipilih — resize proporsional (cuma lebar
      // yang diatur, tinggi ngikut otomatis karena img di dalam wrap-nya width:100%/height:auto).
      if (target.classList.contains("img-resize-handle")) {
        const wrap = target.closest(".img-resize-wrap") as HTMLElement | null;
        if (!wrap) return;
        e.preventDefault();
        target.classList.add("is-resizing");
        resizingImage.current = {
          wrap,
          startX: e.clientX,
          startWidth: wrap.getBoundingClientRect().width,
        };

        const onMove = (ev: PointerEvent) => {
          if (!resizingImage.current) return;
          const delta = ev.clientX - resizingImage.current.startX;
          const next = Math.max(60, Math.round(resizingImage.current.startWidth + delta));
          resizingImage.current.wrap.style.width = `${next}px`;
        };
        const onUp = () => {
          target.classList.remove("is-resizing");
          resizingImage.current = null;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          handleInput();
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return;
      }

      // Klik gambar → pilih (munculin handle resize di pojoknya). Klik di luar gambar
      // manapun → lepas pilihan semua gambar.
      const clickedWrap = target.closest(".img-resize-wrap") as HTMLElement | null;
      deselectImages(container);
      if (clickedWrap && container.contains(clickedWrap)) {
        clickedWrap.classList.add("is-selected");
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    return () => container.removeEventListener("pointerdown", onPointerDown);
  }, [pageId]);

  // Convert tiap <img src="data:..."> (screenshot, atau rumus matematika dari Google
  // Docs/Word — keduanya selalu masuk clipboard sebagai gambar raster, tidak ada cara
  // lain buat "menulis" rumus langsung di NoteMe) supaya tidak ikut tersimpan sebagai
  // data URI raksasa di dalam content, sama seperti gambar yang diupload lewat tombol
  // galeri: dikompres dulu, disimpan ke IndexedDB, lalu src-nya diganti jadi "idb:<id>".
  const persistPastedImages = async (root: ParentNode) => {
    const dataImages = Array.from(root.querySelectorAll<HTMLImageElement>('img[src^="data:"]'));
    await Promise.all(
      dataImages.map(async (img) => {
        try {
          const blob = await dataUrlToCompressedBlob(img.getAttribute("src") ?? "");
          const id = await putImage(blob, pageId);
          registerLocalImage(id, pageId);
          img.setAttribute("src", `idb:${id}`);
          img.setAttribute("data-idb-id", id);
        } catch (err) {
          console.error("Gagal menyimpan gambar hasil paste", err);
          img.remove();
        }
      }),
    );
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");

    // Paste tanpa HTML clipboard (mis. screenshot yang di-copy langsung dari OS) muncul
    // sebagai file gambar mentah, bukan teks/HTML — tanpa ini gambar itu akan diam-diam
    // tidak masuk sama sekali.
    if (!html) {
      const imageFile = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
      if (imageFile) {
        e.preventDefault();
        void insertImage(imageFile);
      }
      return; // teks polos tanpa HTML: biarkan perilaku paste bawaan browser (sudah benar).
    }

    // Sanitize SELURUH html yang ke-paste (teks + tabel + gambar sekaligus), bukan cuma
    // ambil tabelnya doang — sebelumnya kalau ada tabel di dalam paste, semua teks lain
    // di sekitarnya dibuang; sekarang semuanya dipertahankan dalam satu paste yang sama.
    const cleaned = sanitizePastedHtml(html);
    if (!cleaned.trim()) return;
    e.preventDefault();

    const template = document.createElement("template");
    template.innerHTML = cleaned;
    void persistPastedImages(template.content).then(() => {
      insertHtml(template.innerHTML);
    });
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
    { icon: AlignLeft, label: "Rata kiri", run: () => exec("justifyLeft") },
    { icon: AlignCenter, label: "Rata tengah", run: () => exec("justifyCenter") },
    { icon: AlignRight, label: "Rata kanan", run: () => exec("justifyRight") },
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
        title="Highlight"
        aria-label="Highlight"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          ref.current?.focus();
          setPanel("highlight");
        }}
        className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
      >
        <Highlighter className="size-4" />
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

      <span className="ml-auto flex flex-none items-center gap-1 pr-1 text-[11px] text-muted-foreground">
        <span>
          {counts.words} kata · {counts.chars} karakter
        </span>
        <span aria-hidden="true">·</span>
        <span>{saved ? "Tersimpan" : "Menyimpan…"}</span>
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
    <div className="relative flex min-h-0 flex-1 flex-col">
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
        spellCheck
        className="outline-none focus:outline-none focus-visible:outline-none"
        onInput={handleInput}
        onBlur={() => {
          isEditing.current = false;
          flush();
          hideSelectionToolbar();
          if (ref.current && !resizingImage.current) deselectImages(ref.current);
          // Kalau ada update dari luar yang sempat ditahan selagi kita ngetik/fokus,
          // baru sekarang aman buat dipasang ke DOM (caret gak lagi dipakai user).
          if (pendingRemote.current !== null) {
            const html = pendingRemote.current;
            pendingRemote.current = null;
            applyRemoteContent(html);
          }
        }}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          // Auto-list ala Google Docs: "1. " / "- " di awal baris (kosong
          // sebelumnya) langsung jadi list beneran, bukan cuma teks — nomor
          // lanjut otomatis pas Enter, dan Enter dua kali di item kosong
          // otomatis keluar dari list (itu udah perilaku bawaan browser buat
          // contenteditable, gak perlu ditangani manual di sini).
          if (e.key === " " && ref.current && tryAutoConvertLineToList(ref.current)) {
            e.preventDefault();
            handleInput();
            return;
          }
          // Menjaga caret saat pertama kali enter setelah auto-list dibuat.
          // Beberapa browser menghapus blok kosong jika <li><br> baru saja dibuat.
          if (e.key === "Enter") {
            const sel = window.getSelection();
            const anchor = sel?.anchorNode;
            if (anchor && anchor.parentElement?.closest("li") && ref.current) {
              const li = anchor.parentElement.closest("li");
              if (li && li.textContent === "") {
                const br = li.querySelector("br");
                if (!br) li.appendChild(document.createElement("br"));
              }
            }
          }
          if (e.key !== "Backspace" && e.key !== "Delete") return;
          const wrap = ref.current?.querySelector(".img-resize-wrap.is-selected");
          if (!wrap) return;
          e.preventDefault();
          wrap.remove();
          handleInput();
        }}
        onFocus={() => {
          isEditing.current = true;
          setPanel("none");
          setFormatSheetOpen(false);
        }}
        data-placeholder="Mulai menulis catatan…"
        className="note-content min-h-[60vh] flex-1 px-1 py-5 pb-32"
      />

      <TypingIndicator typists={typists} />

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
            <button
              type="button"
              title="Highlight"
              aria-label="Highlight"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                hideSelectionToolbar();
                setPanel("highlight");
              }}
              className="press-sm flex size-8 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
            >
              <Highlighter className="size-4" />
            </button>
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
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHighlight(null)}
                    className="press-sm mb-3 flex w-full items-center gap-2.5 rounded-xl px-1 py-1.5 text-left text-sm text-muted-foreground hover:bg-input hover:text-foreground"
                  >
                    <Ban className="size-4" />
                    None
                  </button>

                  <div className="grid grid-cols-10 gap-1">
                    {HIGHLIGHT_COLOR_GRID.flat().map((color, i) => (
                      <button
                        key={`${color}-${i}`}
                        type="button"
                        title={color}
                        aria-label={color}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHighlight(color)}
                        className="size-5 flex-none rounded-sm border border-black/10 active:scale-90"
                        style={{ background: color }}
                      />
                    ))}
                  </div>

                  {customHighlights.length > 0 && (
                    <>
                      <p className="mb-1.5 mt-3 text-xs font-medium text-muted-foreground">
                        Custom
                      </p>
                      <div className="grid grid-cols-10 gap-1">
                        {customHighlights.map((color) => (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            aria-label={color}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyHighlight(color)}
                            className="size-5 flex-none rounded-sm border border-black/10 active:scale-90"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      title="Tambah warna custom"
                      aria-label="Tambah warna custom"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => customColorInputRef.current?.click()}
                      className="press-sm flex size-8 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
                    >
                      <Plus className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Pipet warna"
                      aria-label="Pipet warna"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={pickHighlightWithEyedropper}
                      className="press-sm flex size-8 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-input hover:text-foreground active:scale-90"
                    >
                      <Pipette className="size-4" />
                    </button>
                    <input
                      ref={customColorInputRef}
                      type="color"
                      className="sr-only"
                      onChange={(e) => addCustomHighlight(e.target.value)}
                    />
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
