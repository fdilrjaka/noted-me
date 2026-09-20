/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

/**
 * Pull delta dari Supabase untuk semua tabel sync (subjects, pages, note_images, todo_*,
 * schedule_classes). Dipisah dari tiap sync-engine karena dua masalah yang sama muncul di
 * semuanya:
 *
 * 1. Jam klien. Dulu kursor pull = `Date.now() - 5s` di perangkat, dibandingkan dengan
 *    `updated_at` yang juga di-stamp jam perangkat. Perangkat dengan jam mundur menulis baris
 *    ber-`updated_at` "di masa lalu" relatif ke kursor perangkat lain, jadi baris itu tidak
 *    pernah ketarik. Sekarang kursor memakai kolom `server_updated_at` (diisi trigger di DB,
 *    lihat migrasi 20260919090000_sync_hardening.sql) dan nilainya dibaca dari jam server.
 *    `updated_at` tetap dipakai untuk logika konflik seperti sebelumnya.
 *
 * 2. Batas 1000 baris PostgREST. Query tanpa range hanya mengembalikan 1000 baris pertama,
 *    sementara kursor tetap maju — sisanya hilang selamanya. Sekarang ditarik per halaman
 *    (keyset pagination, bukan offset: offset bisa melewatkan baris kalau ada baris yang
 *    di-update di tengah paginasi).
 *
 * Kalau kolom `server_updated_at` belum ada di database (migrasi belum dijalankan), semuanya
 * otomatis turun ke perilaku lama berbasis `updated_at` supaya sync tidak mati total.
 */

export type Row = Record<string, unknown>;
export type SyncTable =
  "subjects" | "pages" | "note_images" | "todo_sections" | "todo_tasks" | "schedule_classes";

export type PullResult = { rows: Row[]; column: "server_updated_at" | "updated_at" };

const SERVER_COLUMN = "server_updated_at";
const PAGE_SIZE = 500;
const OVERLAP_MS = 5000;
const EPOCH = "1970-01-01T00:00:00.000Z";
// Tanda bahwa kursor berasal dari jam server. Kursor lama (tanpa prefix) berasal dari jam
// perangkat dan tidak boleh dipakai terhadap kolom server — diperlakukan sebagai "tarik ulang
// dari awal" satu kali.
const CURSOR_PREFIX = "s1:";

// null = belum tahu, true = kolom server ada, false = belum dimigrasi (mode lama).
let serverColumn: boolean | null = null;

export function decodeCursor(cursor: string | null): string {
  if (!cursor) return EPOCH;
  if (cursor.startsWith(CURSOR_PREFIX)) return cursor.slice(CURSOR_PREFIX.length);
  return serverColumn === false ? cursor : EPOCH;
}

function isMissingColumn(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42703" ||
    (msg.includes(SERVER_COLUMN) && /does not exist|could not find/i.test(msg))
  );
}

async function fetchAll(table: SyncTable, column: string, since: string): Promise<Row[]> {
  const client = supabase as unknown as { from: (t: string) => any };
  const byId = new Map<string, Row>();
  let cursor = since;
  let inclusive = false;

  for (let guard = 0; guard < 2000; guard++) {
    let query = client.from(table).select("*");
    // Halaman berikutnya dimulai dari timestamp terakhir secara INKLUSIF supaya baris yang
    // kebetulan sama-sama ber-timestamp itu tidak terlewat di batas halaman; duplikat
    // dibuang lewat `byId`.
    query = inclusive ? query.gte(column, cursor) : query.gt(column, cursor);
    const { data, error } = await query
      .order(column, { ascending: true })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;

    const rows = (data ?? []) as Row[];
    for (const row of rows) byId.set(String(row["id"]), row);
    if (rows.length < PAGE_SIZE) break;

    const lastTs = String(rows[rows.length - 1]![column]);
    // Satu halaman penuh berisi timestamp yang persis sama dengan kursor: gte tidak akan
    // pernah maju. Lompat dengan gt (praktis tidak terjadi karena timestamp server presisi
    // mikrodetik).
    inclusive = !(inclusive && lastTs === cursor);
    cursor = lastTs;
  }
  return [...byId.values()];
}

export async function pullChanges(table: SyncTable, since: string): Promise<PullResult> {
  if (serverColumn !== false) {
    try {
      const rows = await fetchAll(table, SERVER_COLUMN, since);
      serverColumn = true;
      return { rows, column: SERVER_COLUMN };
    } catch (err) {
      if (!isMissingColumn(err)) throw err;
      serverColumn = false;
    }
  }
  return { rows: await fetchAll(table, "updated_at", since), column: "updated_at" };
}

/**
 * Kursor untuk sync berikutnya. Mode server: timestamp server terbaru yang baru saja ditarik
 * dikurangi sedikit overlap (menutup kasus transaksi yang commit terlambat), dan tidak pernah
 * mundur. Mode lama: sama seperti dulu (jam perangkat - 5 detik).
 */
export function nextCursor(previous: string | null, results: PullResult[]): string {
  const serverMode = results.length > 0 && results.every((r) => r.column === SERVER_COLUMN);
  if (!serverMode) return new Date(Date.now() - OVERLAP_MS).toISOString();

  let latest = 0;
  for (const result of results) {
    for (const row of result.rows) {
      const t = Date.parse(String(row[SERVER_COLUMN]));
      if (Number.isFinite(t) && t > latest) latest = t;
    }
  }
  const previousMs = Date.parse(decodeCursor(previous));
  const candidate = latest > 0 ? latest - OVERLAP_MS : 0;
  return CURSOR_PREFIX + new Date(Math.max(previousMs, candidate)).toISOString();
}
