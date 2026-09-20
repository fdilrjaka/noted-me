/**
 * Kalau data lokal gagal di-parse saat startup, store jatuh ke keadaan kosong dan penyimpanan
 * berikutnya menimpa key aslinya. Amankan dulu salinan mentahnya di key terpisah supaya data
 * yang rusak-tapi-mungkin-masih-terbaca tidak hilang permanen (best-effort: kalau storage
 * penuh, salinan ini bisa gagal dibuat).
 */
export function preserveCorrupt(key: string, raw: string | null) {
  if (!raw || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${key}.corrupt`, raw);
  } catch {
    // Best-effort.
  }
}
