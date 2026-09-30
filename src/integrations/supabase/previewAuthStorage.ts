// Auth session storage for the Supabase client.
//
// Mendukung "Remember me" di halaman login:
//  - dicentang (default) → sesi disimpan di localStorage (tetap login setelah browser ditutup),
//    sama persis seperti perilaku sebelumnya.
//  - tidak dicentang     → sesi hanya disimpan di sessionStorage (hilang saat tab/browser ditutup).
// Pilihan disimpan di localStorage (REMEMBER_FLAG) supaya refresh token tetap ditulis ke
// storage yang sama.
const REMEMBER_FLAG = "noteme.auth.remember.v1";

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_FLAG) !== "0";
  } catch {
    return true;
  }
}

/** Dipanggil sebelum login/daftar supaya sesi baru ditulis ke storage yang sesuai. */
export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_FLAG, remember ? "1" : "0");
  } catch {
    // Storage diblokir: abaikan, sesi tetap jalan seperti default.
  }
}

export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return {
    getItem(key: string): string | null {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (shouldRemember()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    },
    removeItem(key: string) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    },
  };
}
