export type AiAttachmentKind = "text" | "image" | "note";

export type AiAttachment = {
  id: string;
  kind: AiAttachmentKind;
  name: string;
  /** Teks hasil ekstraksi (file teks, PDF, DOCX, atau isi halaman catatan). Gambar tidak punya teks. */
  text?: string;
  /** Data URL JPEG hasil kompres. Hanya hidup di memori; tidak ikut disimpan ke riwayat. */
  dataUrl?: string;
  truncated?: boolean;
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: AiAttachment[];
  createdAt: string;
  /** Pesan assistant yang berisi pesan galat (bukan jawaban model). Tidak ikut dikirim ke model. */
  error?: boolean;
};

export type AiChat = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
};

/** Bentuk pesan yang dikirim ke server function. */
export type WireMessage = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
};
