// IndexedDB wrapper murni buat nyimpen BLOB gambar/tulisan tangan secara lokal di device.
// Ini modul generik — sengaja gak import apa pun dari store.ts/sync.ts, biar gak ada
// circular dependency (store.ts & sync.ts yang akan import dari sini, bukan sebaliknya).
//
// Skema: satu database "noteme-images", satu object store "blobs", keyPath "id".
// Tiap record: { id, pageId, contentType, blob, createdAt }.

const DB_NAME = "noteme-images";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

export type LocalImageMeta = {
  id: string;
  pageId: string;
  contentType: string;
  createdAt: string;
  hasBlob: boolean;
};

type BlobRecord = {
  id: string;
  pageId: string;
  contentType: string;
  blob: Blob;
  createdAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB tidak tersedia di lingkungan ini"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("pageId", "pageId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Gagal membuka IndexedDB"));
  });
  return dbPromise;
}

// Tunggu req.onsuccess DAN tx.oncomplete sebelum resolve — req.onsuccess cuma berarti
// operasinya sukses di dalam transaksi, BUKAN jaminan transaksinya udah ke-commit/durable
// ke disk. Safari di mode standalone (Add to Home Screen) khususnya agresif nge-suspend
// proses halaman begitu app diminimize/ditutup; kalau kita cuma nunggu onsuccess, ada
// jendela waktu singkat di mana data kelihatan "tersimpan" di JS tapi transaksinya belum
// benar-benar commit — dan hilang kalau Safari keburu suspend proses di jendela itu.
// Nunggu tx.oncomplete menutup celah itu.
async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    let result: T;
    req.onsuccess = () => {
      result = req.result;
    };
    req.onerror = () => reject(req.error ?? new Error("Operasi IndexedDB gagal"));
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan"));
  });
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Simpan blob gambar secara lokal. Kalau `opts.id` dikasih, dipakai apa adanya (dipakai
 * imageResolver saat cache-in gambar hasil download dari Supabase Storage — id-nya harus
 * sama dengan id yang tercatat di tabel note_images). Kalau tidak, generate id baru
 * (dipakai saat user insert gambar baru dari Editor/DrawingCanvas).
 */
export async function putImage(
  blob: Blob,
  pageId: string,
  opts?: { id?: string },
): Promise<string> {
  const id = opts?.id ?? uid();
  const record: BlobRecord = {
    id,
    pageId,
    contentType: blob.type || "application/octet-stream",
    blob,
    createdAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.put(record));
  return id;
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  try {
    const record = await withStore<BlobRecord | undefined>("readonly", (store) => store.get(id));
    return record?.blob ?? null;
  } catch {
    return null;
  }
}

export async function hasImage(id: string): Promise<boolean> {
  return (await getImageBlob(id)) != null;
}

export async function deleteImage(id: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // Best-effort — kalau gagal hapus lokal, jangan sampai memblokir alur hapus catatan.
  }
}

export async function listImagesForPage(pageId: string): Promise<LocalImageMeta[]> {
  try {
    const db = await openDb();
    return await new Promise<LocalImageMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index("pageId");
      const req = index.getAll(pageId);
      req.onsuccess = () => {
        const records = req.result as BlobRecord[];
        resolve(
          records.map((r) => ({
            id: r.id,
            pageId: r.pageId,
            contentType: r.contentType,
            createdAt: r.createdAt,
            hasBlob: true,
          })),
        );
      };
      req.onerror = () => reject(req.error ?? new Error("Gagal membaca gambar halaman"));
    });
  } catch {
    return [];
  }
}
