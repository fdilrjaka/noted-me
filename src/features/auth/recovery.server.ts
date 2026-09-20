/**
 * Logika kode pemulihan password. Sengaja MURNI (semua akses DB / Auth / waktu / acak disuntik
 * lewat `RecoveryEnv`) supaya bisa diuji tanpa Supabase; implementasi nyatanya ada di
 * recovery.env.server.ts.
 *
 * Kenapa kode pemulihan, bukan email: akun memakai email palsu "<username>@noteme.app" dan
 * proyek tidak punya layanan pengirim email, jadi reset lewat email tidak akan pernah sampai.
 *
 * Model ancaman & pilihan desain:
 *  - Kode 16 karakter dari 31 simbol tanpa yang mirip (0/O, 1/I/L) ~ 79 bit acak. Empat karakter
 *    pertama dipakai sebagai id pencarian (bukan rahasia); sisanya ~ 59 bit rahasia.
 *  - Yang disimpan hanya PBKDF2-SHA256 (salt per kode). Batas iterasi WebCrypto di Cloudflare
 *    Workers adalah 100.000; dengan rahasia ~59 bit, 20.000 sudah tidak layak di-brute-force
 *    offline dan tetap murah saat membuat 10 kode sekaligus.
 *  - Sekali pakai, dan penandaan "terpakai" atomik (UPDATE ... WHERE used_at IS NULL) supaya dua
 *    permintaan bersamaan tidak bisa memakai kode yang sama.
 *  - Percobaan salah dibatasi per username (juga yang tidak terdaftar) dan semua kegagalan
 *    memberi pesan yang sama, jadi tidak bisa dipakai untuk menebak username yang terdaftar.
 *    Untuk username tak dikenal tetap dijalankan satu hash PBKDF2 semu supaya waktu responsnya
 *    tidak membedakan.
 */
import { normalizeUsername, passwordErrorMessage } from "@/lib/noteme/credentialPolicy";

// 31 simbol: tanpa I, L, O, 0, 1 (mudah tertukar saat dicatat tangan).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 16;
export const CODE_ID_LENGTH = 4;
export const CODE_COUNT = 10;
export const PBKDF2_ITERATIONS = 20_000;
export const MAX_FAILS = 5;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

export const ACCOUNT_EMAIL_DOMAIN = "@noteme.app";

export const GENERIC_INVALID = "Username atau kode pemulihan salah, atau kode sudah pernah dipakai";

export type NewCodeRow = {
  userId: string;
  usernameKey: string;
  batchId: string;
  codeId: string;
  salt: string;
  iterations: number;
  hash: string;
};

export type StoredCode = {
  id: string;
  userId: string;
  salt: string;
  iterations: number;
  hash: string;
  usedAt: string | null;
};

export type Throttle = {
  fails: number;
  windowStartedAt: string;
  lockedUntil: string | null;
};

export interface RecoveryStore {
  insertBatch(rows: NewCodeRow[]): Promise<void>;
  deleteOtherBatches(userId: string, batchId: string): Promise<void>;
  findCode(usernameKey: string, codeId: string): Promise<StoredCode | null>;
  /** Atomik. True hanya untuk satu pemanggil yang berhasil menandai; false kalau sudah terpakai. */
  markUsed(id: string, at: Date): Promise<boolean>;
  restoreUnused(id: string): Promise<void>;
  countUnused(userId: string): Promise<number>;
  getThrottle(key: string): Promise<Throttle | null>;
  saveThrottle(key: string, throttle: Throttle): Promise<void>;
  clearThrottle(key: string): Promise<void>;
}

export interface RecoveryEnv {
  store: RecoveryStore;
  setPassword(userId: string, password: string): Promise<void>;
  now(): Date;
  randomBytes(length: number): Uint8Array;
  randomUUID(): string;
}

// ---------------------------------------------------------------------------------------------
// Kode & hash

/** Satu karakter acak seragam dari alfabet (rejection sampling, tanpa modulo bias). */
function randomChars(env: RecoveryEnv, count: number): string {
  const limit = 256 - (256 % CODE_ALPHABET.length); // 248
  let out = "";
  while (out.length < count) {
    for (const byte of env.randomBytes(count * 2)) {
      if (byte >= limit) continue;
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (out.length === count) break;
    }
  }
  return out;
}

export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)!.join("-");
}

/** Bentuk baku dari input user (huruf besar, tanpa spasi/strip). Null kalau bentuknya tidak sah. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function hashCode(code: string, saltB64: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltB64), iterations },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function constantTimeEqual(a: string, b: string): boolean {
  const x = fromBase64(a);
  const y = fromBase64(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// ---------------------------------------------------------------------------------------------
// Membuat kode

export type CreateResult =
  { ok: true; codes: string[] } | { ok: false; reason: "unsupported_account"; message: string };

/** Username baku dari email akun; null kalau email bukan bentuk "<username>@noteme.app". */
export function usernameFromEmail(email: string): string | null {
  if (!email.toLowerCase().endsWith(ACCOUNT_EMAIL_DOMAIN)) return null;
  const name = email.slice(0, -ACCOUNT_EMAIL_DOMAIN.length);
  const key = normalizeUsername(name);
  return key && key === name.toLowerCase() ? key : null;
}

/**
 * Buat satu batch kode baru untuk `userId` dan ganti semua batch lama (kode lama tidak berlaku
 * lagi). Kode polos hanya dikembalikan di sini, tidak pernah disimpan.
 */
export async function createRecoveryCodes(
  env: RecoveryEnv,
  input: { userId: string; email: string },
): Promise<CreateResult> {
  const usernameKey = usernameFromEmail(input.email);
  if (!usernameKey) {
    return {
      ok: false,
      reason: "unsupported_account",
      message: "Akun ini tidak mendukung kode pemulihan",
    };
  }

  const batchId = env.randomUUID();
  const usedIds = new Set<string>();
  const plain: string[] = [];
  const rows: NewCodeRow[] = [];

  while (plain.length < CODE_COUNT) {
    const code = randomChars(env, CODE_LENGTH);
    const codeId = code.slice(0, CODE_ID_LENGTH);
    if (usedIds.has(codeId)) continue; // (username, code_id) harus unik
    usedIds.add(codeId);
    const salt = toBase64(env.randomBytes(16));
    rows.push({
      userId: input.userId,
      usernameKey,
      batchId,
      codeId,
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: await hashCode(code, salt, PBKDF2_ITERATIONS),
    });
    plain.push(formatCode(code));
  }

  // Sisipkan batch baru DULU, baru hapus yang lama: kalau langkah kedua gagal, user tidak
  // pernah berada dalam keadaan tanpa kode sama sekali.
  await env.store.insertBatch(rows);
  await env.store.deleteOtherBatches(input.userId, batchId);
  return { ok: true, codes: plain };
}

// ---------------------------------------------------------------------------------------------
// Reset password

export type ResetResult =
  | { ok: true; remaining: number }
  | {
      ok: false;
      reason: "password_policy" | "invalid" | "rate_limited";
      message: string;
      retryAfterSeconds?: number;
    };

const DUMMY_SALT = toBase64(new Uint8Array(16));

async function registerFailure(env: RecoveryEnv, key: string): Promise<void> {
  const now = env.now();
  const current = await env.store.getThrottle(key);
  let fails = 0;
  let windowStartedAt = now.toISOString();
  if (current && now.getTime() - Date.parse(current.windowStartedAt) <= WINDOW_MS) {
    fails = current.fails;
    windowStartedAt = current.windowStartedAt;
  }
  fails += 1;
  await env.store.saveThrottle(key, {
    fails,
    windowStartedAt,
    lockedUntil: fails >= MAX_FAILS ? new Date(now.getTime() + LOCK_MS).toISOString() : null,
  });
}

export async function resetPasswordWithCode(
  env: RecoveryEnv,
  input: { username: string; code: string; newPassword: string },
): Promise<ResetResult> {
  // Aturan password dicek dulu dan tidak dihitung sebagai percobaan: ini kesalahan input, bukan
  // tebakan kode.
  const policyMessage = passwordErrorMessage(input.newPassword);
  if (policyMessage) return { ok: false, reason: "password_policy", message: policyMessage };

  const usernameKey = normalizeUsername(input.username);
  const throttleKey = `u:${usernameKey}`;

  const throttle = await env.store.getThrottle(throttleKey);
  if (throttle?.lockedUntil) {
    const remainingMs = Date.parse(throttle.lockedUntil) - env.now().getTime();
    if (remainingMs > 0) {
      const minutes = Math.ceil(remainingMs / 60_000);
      return {
        ok: false,
        reason: "rate_limited",
        message: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit`,
        retryAfterSeconds: Math.ceil(remainingMs / 1000),
      };
    }
  }

  const code = normalizeCode(input.code);
  const stored =
    code && usernameKey
      ? await env.store.findCode(usernameKey, code.slice(0, CODE_ID_LENGTH))
      : null;

  // Selalu jalankan tepat satu PBKDF2, ada atau tidak ada kodenya.
  const hashMatches = await (async () => {
    if (!code || !stored) {
      await hashCode(code ?? "0".repeat(CODE_LENGTH), DUMMY_SALT, PBKDF2_ITERATIONS);
      return false;
    }
    return constantTimeEqual(await hashCode(code, stored.salt, stored.iterations), stored.hash);
  })();

  if (!stored || !hashMatches || stored.usedAt) {
    await registerFailure(env, throttleKey);
    return { ok: false, reason: "invalid", message: GENERIC_INVALID };
  }

  // Klaim kode secara atomik sebelum mengubah password.
  const claimed = await env.store.markUsed(stored.id, env.now());
  if (!claimed) {
    await registerFailure(env, throttleKey);
    return { ok: false, reason: "invalid", message: GENERIC_INVALID };
  }

  try {
    await env.setPassword(stored.userId, input.newPassword);
  } catch (err) {
    // Password gagal diganti (masalah di sisi Auth): kembalikan kode supaya user bisa mencoba lagi
    // dan tidak kehilangan satu kodenya karena kegagalan yang bukan salahnya.
    await env.store.restoreUnused(stored.id).catch(() => undefined);
    throw err;
  }

  await env.store.clearThrottle(throttleKey);
  return { ok: true, remaining: await env.store.countUnused(stored.userId) };
}

export async function recoveryStatus(
  env: RecoveryEnv,
  userId: string,
): Promise<{ remaining: number }> {
  return { remaining: await env.store.countUnused(userId) };
}
