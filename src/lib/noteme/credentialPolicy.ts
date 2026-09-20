/**
 * Kebijakan kredensial. Murni (tanpa dependensi browser/server) supaya dipakai persis sama di
 * form daftar, ganti password, reset password, DAN di server function reset.
 *
 * Kebijakan password hanya berlaku saat MEMBUAT / MENGGANTI password. Login sengaja tidak
 * memeriksanya: akun lama yang password-nya belum memenuhi aturan baru tetap harus bisa masuk.
 */

export const MIN_PASSWORD_LENGTH = 6;

// Himpunan simbol ini sengaja subset dari daftar "symbols" milik Supabase Auth, jadi kalau
// project kelak mengaktifkan password requirements di dashboard, password yang lolos di sini
// pasti lolos di sana.
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;
export const SPECIAL_CHAR_EXAMPLES = "! @ # $ % & *";

export type PasswordIssue = "length" | "special";

export function checkPassword(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) issues.push("length");
  if (!SPECIAL_CHAR_REGEX.test(password)) issues.push("special");
  return issues;
}

/** Pesan untuk toast; null kalau password memenuhi semua aturan. */
export function passwordErrorMessage(password: string): string | null {
  const issues = checkPassword(password);
  if (issues.length === 0) return null;
  const special = `harus mengandung minimal 1 karakter spesial (contoh: ${SPECIAL_CHAR_EXAMPLES})`;
  if (issues.length === 2) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter dan ${special}`;
  }
  return issues[0] === "length"
    ? `Password minimal ${MIN_PASSWORD_LENGTH} karakter`
    : `Password ${special}`;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

/**
 * Bentuk baku username: dipakai untuk membentuk email akun ("<baku>@noteme.app") dan sebagai
 * kunci pencarian kode pemulihan. Lenient (membuang karakter tak dikenal) supaya akun lama
 * yang dulu terdaftar dengan spasi/simbol tetap bisa login.
 */
export function normalizeUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

/** Validasi ketat untuk username BARU (daftar). Null kalau valid, selain itu pesan error. */
export function newUsernameError(username: string): string | null {
  const wanted = username.trim().toLowerCase();
  const clean = normalizeUsername(username);
  // Kalau ada karakter yang akan dibuang diam-diam, dua username berbeda (mis. "a@b" dan
  // "ab") bisa berujung pada akun yang sama. Tolak di awal.
  if (wanted !== clean) {
    return "Username hanya boleh huruf, angka, titik, garis bawah, dan strip (tanpa spasi atau simbol lain)";
  }
  if (clean.length < USERNAME_MIN) return `Username minimal ${USERNAME_MIN} karakter`;
  if (clean.length > USERNAME_MAX) return `Username maksimal ${USERNAME_MAX} karakter`;
  return null;
}
