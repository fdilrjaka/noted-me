/**
 * Riwayat chat di IndexedDB (BUKAN localStorage: catatan sudah memakai kuota localStorage).
 * Disimpan per akun. Data URL gambar tidak ikut disimpan; hanya nama filenya.
 * Kalau IndexedDB tidak tersedia (mis. mode privat tertentu), riwayat jatuh ke memori.
 */
import type { AiAttachment, AiChat } from "../types";

const DB_NAME = "noteme-ai";
const DB_VERSION = 1;
const STORE = "chats";

const memory = new Map<string, AiChat>();
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no indexedDB"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" }).createIndex("userId", "userId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Gagal membuka IndexedDB"));
    };
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => {
      result = req.result;
    };
    // Tunggu commit, bukan hanya sukses request (Safari bisa menunda proses halaman).
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan"));
  });
}

function stripAttachment(a: AiAttachment): AiAttachment {
  const { dataUrl: _dataUrl, ...rest } = a;
  return rest;
}

export function stripForStorage(chat: AiChat): AiChat {
  return {
    ...chat,
    messages: chat.messages.map((m) =>
      m.attachments ? { ...m, attachments: m.attachments.map(stripAttachment) } : m,
    ),
  };
}

export async function listChats(userId: string): Promise<AiChat[]> {
  let all: AiChat[];
  try {
    all = await run("readonly", (s) => s.index("userId").getAll(IDBKeyRange.only(userId)));
  } catch {
    all = [...memory.values()].filter((c) => c.userId === userId);
  }
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveChat(chat: AiChat): Promise<void> {
  const stored = stripForStorage(chat);
  memory.set(stored.id, stored);
  try {
    await run("readwrite", (s) => s.put(stored));
  } catch {
    // tetap ada di memori selama tab terbuka
  }
}

export async function deleteChat(id: string): Promise<void> {
  memory.delete(id);
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {
    // abaikan
  }
}
