import { useEffect, useRef, useState } from "react";
import { Copy, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/import-export/shared";

/**
 * Menampilkan kode pemulihan SATU KALI. Sengaja tidak bisa ditutup lewat klik di luar / Esc:
 * kode ini tidak disimpan dalam bentuk terbaca di server, jadi kalau hilang di sini tidak ada
 * jalan untuk melihatnya lagi. User harus menyatakan sudah menyimpannya dulu.
 */
export function RecoveryCodesDialog({
  codes,
  onDone,
}: {
  codes: string[] | null;
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const doneRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setSaved(false);
  }, [codes]);

  useEffect(() => {
    if (!codes) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [codes]);

  if (!codes) return null;

  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kode disalin");
    } catch {
      toast.error("Tidak bisa menyalin otomatis, salin manual dari daftar");
    }
  };

  const download = () => {
    const body =
      "Kode pemulihan NoteMe\n" +
      "Tiap kode hanya bisa dipakai sekali untuk mengatur ulang password.\n" +
      "Simpan file ini di tempat aman dan jangan bagikan ke siapa pun.\n\n" +
      `${text}\n`;
    downloadBlob("noteme-kode-pemulihan.txt", new Blob([body], { type: "text/plain" }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="glass-card spring-in max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl p-6">
        <h2
          id="recovery-title"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <KeyRound className="size-5 text-primary" /> Simpan kode pemulihan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ini satu-satunya cara mengatur ulang password kalau kamu lupa. Tiap kode hanya berlaku
          sekali dan <strong>tidak akan ditampilkan lagi</strong> setelah jendela ini ditutup.
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-1.5 rounded-2xl border border-border bg-background/40 p-3 font-mono text-[13px] tracking-wider sm:grid-cols-2">
          {codes.map((code) => (
            <li key={code} className="select-all">
              {code}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void copy()}
            className="press-sm flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-medium active:scale-95"
          >
            <Copy className="size-4" /> Salin semua
          </button>
          <button
            onClick={download}
            className="press-sm flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-medium active:scale-95"
          >
            <Download className="size-4" /> Unduh .txt
          </button>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          Saya sudah menyimpan kode ini di tempat yang aman
        </label>

        <button
          ref={doneRef}
          disabled={!saved}
          onClick={onDone}
          className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}
