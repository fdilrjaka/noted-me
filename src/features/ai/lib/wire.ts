/**
 * Modul murni (tanpa DOM, tanpa secret) yang dipakai KLIEN untuk menyusun pesan dan SERVER
 * untuk memvalidasi pesan itu. Semua batas ada di satu tempat supaya keduanya selalu sepakat.
 */
import type { AiAttachment, AiMessage, WireMessage } from "../types";

export const LIMITS = {
  /** Jumlah pesan terakhir yang dikirim ke model. */
  maxMessages: 16,
  /** Anggaran karakter riwayat (teks + lampiran) yang disusun klien. */
  historyCharBudget: 120_000,
  maxAttachments: 5,
  maxAttachmentChars: 30_000,
  /** Total teks lampiran dalam satu pesan. */
  maxAttachmentCharsPerMessage: 100_000,
  maxInputChars: 20_000,
  maxImages: 4,
  /** Panjang maksimum satu data URL gambar (karakter base64). */
  maxImageChars: 3_500_000,
  /** Batas di server (lebih longgar dari klien, hanya untuk menolak payload tak wajar). */
  maxMessageChars: 160_000,
  maxTotalChars: 450_000,
} as const;

const IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function attachmentBlock(a: AiAttachment): string {
  const name = a.name.replace(/["<>]/g, "'");
  // Isi lampiran adalah DATA, bukan instruksi: cegah isinya menutup blok lebih awal.
  const body = (a.text ?? "").replace(/<\/lampiran>/gi, "</ lampiran>");
  return `<lampiran nama="${name}"${a.truncated ? ' dipotong="ya"' : ""}>\n${body}\n</lampiran>`;
}

function messageToWire(m: AiMessage, includeImages: boolean): WireMessage {
  if (m.role === "assistant") return { role: "assistant", content: m.text };

  const parts: string[] = [];
  const images: string[] = [];
  for (const a of m.attachments ?? []) {
    if (a.kind === "image") {
      if (includeImages && a.dataUrl) images.push(a.dataUrl);
      else parts.push(`[gambar terlampir sebelumnya: ${a.name}]`);
    } else if (a.text) {
      parts.push(attachmentBlock(a));
    }
  }
  if (m.text.trim()) parts.push(m.text.trim());
  const content = parts.join("\n\n") || "(lihat lampiran)";
  return images.length > 0 ? { role: "user", content, images } : { role: "user", content };
}

/**
 * Susun riwayat untuk dikirim ke model.
 * - Pesan galat dibuang.
 * - Gambar hanya ikut untuk pesan TERBARU yang punya gambar. Gambar lama diganti catatan teks,
 *   supaya payload tidak membengkak di setiap giliran.
 * - Pesan beruntun dengan peran sama digabung (sebagian gateway menolak urutan seperti itu).
 * - Dipotong dari yang terlama sesuai batas jumlah dan anggaran karakter; pesan terbaru selalu ikut.
 */
export function buildWireMessages(messages: AiMessage[]): WireMessage[] {
  const usable = messages.filter((m) => !m.error);

  let imageOwner = -1;
  for (let i = usable.length - 1; i >= 0; i--) {
    if (usable[i]?.attachments?.some((a) => a.kind === "image" && a.dataUrl)) {
      imageOwner = i;
      break;
    }
  }

  const merged: WireMessage[] = [];
  usable.forEach((m, i) => {
    const wire = messageToWire(m, i === imageOwner);
    const prev = merged[merged.length - 1];
    if (prev && prev.role === wire.role) {
      prev.content = `${prev.content}\n\n${wire.content}`;
      if (wire.images) prev.images = [...(prev.images ?? []), ...wire.images];
    } else {
      merged.push(wire);
    }
  });

  const kept: WireMessage[] = [];
  let total = 0;
  for (let i = merged.length - 1; i >= 0; i--) {
    const wire = merged[i]!;
    const size = wire.content.length;
    if (
      kept.length > 0 &&
      (kept.length >= LIMITS.maxMessages || total + size > LIMITS.historyCharBudget)
    ) {
      break;
    }
    kept.unshift(wire);
    total += size;
  }
  while (kept.length > 0 && kept[0]!.role !== "user") kept.shift();
  return kept;
}

function invalid(): never {
  throw new Error("Permintaan tidak valid");
}

/** Validasi di server. Melempar Error("Permintaan tidak valid") untuk input yang tidak wajar. */
export function parseWireMessages(input: unknown): WireMessage[] {
  if (!input || typeof input !== "object") invalid();
  const raw = (input as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.maxMessages) invalid();

  let total = 0;
  const out: WireMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") invalid();
    const { role, content, images } = item as {
      role?: unknown;
      content?: unknown;
      images?: unknown;
    };
    if (role !== "user" && role !== "assistant") invalid();
    if (typeof content !== "string" || content.length === 0) invalid();
    if (content.length > LIMITS.maxMessageChars) invalid();
    total += content.length;

    if (images === undefined) {
      out.push({ role, content });
      continue;
    }
    if (role !== "user" || !Array.isArray(images) || images.length > LIMITS.maxImages) invalid();
    for (const url of images) {
      if (typeof url !== "string" || url.length > LIMITS.maxImageChars) invalid();
      if (!IMAGE_DATA_URL.test(url)) invalid();
      total += url.length;
    }
    out.push({ role, content, images: images as string[] });
  }

  if (total > LIMITS.maxTotalChars + LIMITS.maxImages * LIMITS.maxImageChars) invalid();
  if (out[out.length - 1]?.role !== "user") invalid();
  return out;
}
