/**
 * Penanda satu-kali (per tab, pakai sessionStorage) supaya animasi "Welcome!" cuma muncul
 * begitu user baru saja meninggalkan halaman login (baik lewat login/daftar sukses maupun
 * "Lanjut tanpa akun"). Navigasi lain ke "/" (refresh, klik logo, dsb) tidak memicu animasi ini.
 */
const KEY = "noteme:show-welcome-intro";

export function markWelcomeIntroPending(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

/** Baca lalu langsung hapus flag-nya — animasi hanya diputar satu kali. */
export function consumeWelcomeIntroPending(): boolean {
  try {
    const pending = sessionStorage.getItem(KEY) === "1";
    if (pending) sessionStorage.removeItem(KEY);
    return pending;
  } catch {
    return false;
  }
}
