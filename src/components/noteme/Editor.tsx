import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Camera,
  CheckSquare,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table,
  Underline,
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

export function Editor({ pageId, initialContent, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialContent || "";
    setSaved(true);
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
    handleInput();
  };

  const insertImage = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    insertHtml(`<img src="${url}" alt="Gambar catatan" />`);
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
    {
      icon: Table,
      label: "Tabel",
      run: () =>
        insertHtml(
          '<table><thead><tr><th>Kolom 1</th><th>Kolom 2</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>',
        ),
    },
    { icon: ImageIcon, label: "Gambar", run: () => fileRef.current?.click() },
    { icon: Camera, label: "Kamera", run: () => cameraRef.current?.click() },
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
        <span className="ml-auto flex-none pr-1 text-[11px] text-muted-foreground">
          {saved ? "Tersimpan" : "Menyimpan…"}
        </span>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={flush}
        data-placeholder="Mulai menulis catatan…"
        className="note-content min-h-[60vh] flex-1 px-1 py-5"
      />

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
