import { FILE_LIMITS, type SheetCell } from "./fileSpec";

/** 0 -> A, 25 -> Z, 26 -> AA */
export function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

/** Teks yang diketik pengguna -> sel: angka tetap angka, kosong -> null. */
export function parseCellInput(raw: string): SheetCell {
  const t = raw.trim();
  if (t === "") return null;
  if (/^-?\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return raw.slice(0, FILE_LIMITS.maxCellChars);
}
