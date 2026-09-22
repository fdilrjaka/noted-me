/**
 * Penanda bahwa user secara sadar memilih "Lanjut tanpa akun" dari halaman login.
 * Dipakai supaya route utama tidak melempar balik ke /auth terus-menerus setelah user
 * memilih mode tamu. Ditolak (di-clear) begitu user login atau logout, supaya alur
 * "logout -> balik ke halaman login" tetap berlaku.
 */
const KEY = "noteme:guest-mode";

export function isGuestMode(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuestMode(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

export function clearGuestMode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
