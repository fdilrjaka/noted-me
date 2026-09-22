/**
 * Kebijakan kredensial. Murni (tanpa dependensi browser/server) supaya dipakai persis sama di
 * form daftar, ganti password, dan reset password.
 *
 * Kebijakan password hanya berlaku saat MEMBUAT / MENGGANTI password. Login sengaja tidak
 * memeriksanya: akun lama tetap harus bisa masuk. Tidak ada syarat karakter spesial — password
 * seperti "Apaya204040" (huruf & angka biasa) valid selama panjangnya cukup.
 */

export const MIN_PASSWORD_LENGTH = 6;

export type PasswordIssue = "length";

export function checkPassword(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) issues.push("length");
  return issues;
}

/** Pesan untuk toast; null kalau password memenuhi semua aturan. */
export function passwordErrorMessage(password: string): string | null {
  const issues = checkPassword(password);
  if (issues.length === 0) return null;
  return `Password minimal ${MIN_PASSWORD_LENGTH} karakter`;
}

/** Format email dasar. Validasi sesungguhnya (apakah email benar-benar ada) terjadi lewat
 * kode verifikasi yang dikirim ke email tersebut. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function newEmailError(email: string): string | null {
  if (!isValidEmail(email)) return "Masukkan alamat email yang valid";
  return null;
}

export const OTP_LENGTH = 6;

// --- Kompatibilitas mundur -----------------------------------------------------------------
// Dulu akun dibuat dari "username" (email palsu "<username>@noteme.app") dan kode pemulihan
// dicari lewat kunci username ini. Login sekarang pakai email asli, tapi fungsi ini masih
// dipakai oleh subsistem kode pemulihan akun LAMA (recovery.server.ts) — jangan dihapus.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

export function normalizeUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}
