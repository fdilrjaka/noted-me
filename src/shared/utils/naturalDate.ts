/**
 * Parser tanggal & waktu dari bahasa natural (Indonesia + Inggris) di judul task.
 *
 * Contoh yang harus kedetect:
 *  - "Follow up dengan Liz besok pagi"          -> besok, pagi (~08:00)
 *  - "tugas manajemen besok siang jam 2"        -> besok, 14:00
 *  - "lusa jam 2 siang"                          -> lusa, 14:00
 *  - "pagi ini jam 8"                            -> hari ini, 08:00
 *  - "tanggal 20 jam sekian"                     -> tanggal 20 bulan berjalan, tanpa jam
 *  - "meeting tomorrow at 10.30am"               -> tomorrow, 10:30
 *  - "call mom next monday 5pm"                  -> senin depan, 17:00
 *
 * Strategi: cari span tanggal & span waktu secara independen dengan regex,
 * lalu gabungkan hasilnya jadi satu tanggal (Date, tanpa jam kalau waktu ga ketemu).
 * Setiap span match juga disimpan supaya UI bisa highlight & judul bisa dibersihkan.
 */

export type NaturalMatch = {
  start: number;
  end: number;
  kind: "date" | "time";
};

export type NaturalDateResult = {
  /** null kalau tidak ada tanggal/waktu yang kedetect sama sekali */
  date: Date | null;
  /** true kalau jamnya juga ketemu (bukan cuma tanggal) */
  hasTime: boolean;
  /** rentang teks yang match, buat highlight di input */
  matches: NaturalMatch[];
  /** judul setelah semua match dibuang & dirapikan spasinya */
  cleanedTitle: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS_ID = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];
const MONTHS_EN = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTHS_EN_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function monthIndex(word: string): number | null {
  const w = word.toLowerCase();
  let i = MONTHS_ID.indexOf(w);
  if (i !== -1) return i;
  i = MONTHS_EN.indexOf(w);
  if (i !== -1) return i;
  i = MONTHS_EN_SHORT.indexOf(w.slice(0, 3));
  if (i !== -1 && MONTHS_EN_SHORT[i] === w.slice(0, 3)) return i;
  return null;
}

const WEEKDAYS_ID = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const WEEKDAYS_ID_ALT: Record<string, number> = { "jum'at": 5, jum: 5 };
const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function weekdayIndex(word: string): number | null {
  const w = word.toLowerCase();
  let i = WEEKDAYS_ID.indexOf(w);
  if (i !== -1) return i;
  if (w in WEEKDAYS_ID_ALT) return WEEKDAYS_ID_ALT[w] ?? null;
  i = WEEKDAYS_EN.indexOf(w);
  if (i !== -1) return i;
  return null;
}

/** Waktu-hari (period) → jam default kalau cuma disebut tanpa angka jam eksplisit. */
const PERIOD_DEFAULT_HOUR: Record<string, number> = {
  pagi: 8,
  siang: 13,
  sore: 16,
  malam: 19,
  dini: 3, // dini hari
  morning: 8,
  afternoon: 13,
  evening: 18,
  night: 20,
};

function stripDiacriticless(s: string) {
  return s;
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function findDateMatch(text: string): { date: Date; match: NaturalMatch } | null {
  const today = startOfDay(new Date());

  // 1) "hari ini" / "today" / "pagi|siang|sore|malam ini" (= hari ini)
  let re = /\b(hari ini|(pagi|siang|sore|malam)\s+ini|today|tonight)\b/gi;
  let m = re.exec(text);
  if (m) {
    return { date: today, match: { start: m.index, end: m.index + m[0].length, kind: "date" } };
  }

  // 2) "besok" / "tomorrow"
  re = /\b(besok|tomorrow)\b/gi;
  m = re.exec(text);
  if (m) {
    return {
      date: new Date(today.getTime() + DAY_MS),
      match: { start: m.index, end: m.index + m[0].length, kind: "date" },
    };
  }

  // 3) "lusa" / "day after tomorrow"
  re = /\b(lusa|day after tomorrow)\b/gi;
  m = re.exec(text);
  if (m) {
    return {
      date: new Date(today.getTime() + 2 * DAY_MS),
      match: { start: m.index, end: m.index + m[0].length, kind: "date" },
    };
  }

  // 4) "tanggal 20 desember" / "tgl 20" / "20 desember" / "december 20" / "dec 20"
  //
  // PENTING: grup nama bulan HARUS berupa alternasi nama bulan asli (bukan [a-zA-Z]+),
  // supaya kata sembarang setelah angka (misal "jam" di "tanggal 20 jam 10.30") tidak
  // ikut ke-swallow ke dalam span match tanggal.
  const monthAlt = [...MONTHS_ID, ...MONTHS_EN, ...MONTHS_EN_SHORT].join("|");
  re = new RegExp(
    `\\b(?:tanggal|tgl)\\s+(\\d{1,2})(?:\\s+(${monthAlt}))?\\b` +
      `|\\b(\\d{1,2})\\s+(${monthAlt})\\b` +
      `|\\b(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`,
    "gi",
  );
  while ((m = re.exec(text))) {
    let day: number | null = null;
    let monthWord: string | undefined;
    if (m[1] !== undefined) {
      day = parseInt(m[1], 10);
      monthWord = m[2];
    } else if (m[3] !== undefined) {
      day = parseInt(m[3], 10);
      monthWord = m[4];
    } else if (m[6] !== undefined) {
      day = parseInt(m[6], 10);
      monthWord = m[5];
    }
    if (day === null || day < 1 || day > 31) continue;
    let month = today.getMonth();
    if (monthWord) {
      const mi = monthIndex(monthWord);
      if (mi === null) {
        // Karena grup bulan sekarang cuma bisa match nama bulan asli, kasus ini
        // seharusnya tidak pernah kejadian lagi kecuali untuk pola "tanggal N" tanpa bulan.
        if (m[1] === undefined) continue;
      } else {
        month = mi;
      }
    }
    const year = today.getFullYear();
    let candidate = new Date(year, month, day);
    // kalau tanggalnya sudah lewat tahun ini & user ga sebut bulan, anggap bulan depan/tahun depan
    if (!monthWord && candidate < today) {
      candidate = new Date(year, month + 1, day);
    } else if (monthIndex(monthWord ?? "") !== null && candidate < today) {
      candidate = new Date(year + 1, month, day);
    }
    return { date: candidate, match: { start: m.index, end: m.index + m[0].length, kind: "date" } };
  }

  // 5) nama hari: "senin", "senin depan", "next monday"
  re =
    /\b(next\s+)?(minggu|senin|selasa|rabu|kamis|jumat|jum'at|sabtu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(\s+depan)?\b/gi;
  m = re.exec(text);
  if (m) {
    const wi = weekdayIndex(m[2]!);
    if (wi !== null) {
      const todayIdx = today.getDay();
      let diff = (wi - todayIdx + 7) % 7;
      if (diff === 0) diff = 7; // "senin" yang diucapkan biasanya maksud senin berikutnya
      if (m[1] || m[3]) {
        // "next monday" / "senin depan" eksplisit → tetap ke kejadian berikutnya
        if (diff === 0) diff = 7;
      }
      return {
        date: new Date(today.getTime() + diff * DAY_MS),
        match: { start: m.index, end: m.index + m[0].length, kind: "date" },
      };
    }
  }

  return null;
}

function findTimeMatch(text: string): { hour: number; minute: number; match: NaturalMatch } | null {
  // 0) periode di depan "jam": "siang jam 2", "sore jam 5.30", "pagi jam 8"
  const re0 = /\b(pagi|siang|sore|malam)\s+(?:jam|pukul)\s+(\d{1,2})(?:[.:](\d{2}))?\b/gi;
  const m0 = re0.exec(text);
  if (m0) {
    let hour = parseInt(m0[2]!, 10);
    const minute = m0[3] ? parseInt(m0[3], 10) : 0;
    hour = applyPeriod(hour, m0[1]!);
    return { hour, minute, match: { start: m0.index, end: m0.index + m0[0].length, kind: "time" } };
  }

  // 1) "jam 10.30" / "jam 10:30" / "pukul 14.00" / "at 10.30"
  let re = /\b(?:jam|pukul|at)\s+(\d{1,2})[.:](\d{2})\s*(am|pm|pagi|siang|sore|malam)?\b/gi;
  let m = re.exec(text);
  if (m) {
    let hour = parseInt(m[1]!, 10);
    const minute = parseInt(m[2]!, 10);
    hour = applyPeriod(hour, m[3]);
    return { hour, minute, match: { start: m.index, end: m.index + m[0].length, kind: "time" } };
  }

  // 2) "10.30am" / "2pm" tanpa kata jam/pukul di depan
  re = /\b(\d{1,2})(?:[.:](\d{2}))?\s?(am|pm)\b/gi;
  m = re.exec(text);
  if (m) {
    let hour = parseInt(m[1]!, 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    hour = applyPeriod(hour, m[3]!);
    return { hour, minute, match: { start: m.index, end: m.index + m[0].length, kind: "time" } };
  }

  // 3) "jam 2 siang" / "jam 8 pagi" / "jam 7" (tanpa menit, boleh tanpa periode)
  re = /\b(?:jam|pukul)\s+(\d{1,2})\s*(pagi|siang|sore|malam)?\b/gi;
  m = re.exec(text);
  if (m) {
    // "jam sekian" ditangani terpisah di bawah (bukan match di sini karena \d wajib)
    let hour = parseInt(m[1]!, 10);
    if (hour >= 1 && hour <= 24) {
      hour = applyPeriod(hour, m[2]);
      return {
        hour,
        minute: 0,
        match: { start: m.index, end: m.index + m[0].length, kind: "time" },
      };
    }
  }

  // 4) hanya periode tanpa angka jam eksplisit: "pagi ini jam 8" sudah kena kasus 3.
  //    Tapi "besok pagi" / "besok siang jam 2" → coba ambil period yang menempel ke tanggal.
  re = /\b(pagi|siang|sore|malam|morning|afternoon|evening|night)\b/gi;
  m = re.exec(text);
  if (m) {
    const key = m[1]!.toLowerCase();
    if (key in PERIOD_DEFAULT_HOUR) {
      return {
        hour: PERIOD_DEFAULT_HOUR[key]!,
        minute: 0,
        match: { start: m.index, end: m.index + m[0].length, kind: "time" },
      };
    }
  }

  return null;
}

function applyPeriod(hour: number, period?: string): number {
  if (!period) return hour;
  const p = period.toLowerCase();
  if (p === "am") return hour === 12 ? 0 : hour;
  if (p === "pm") return hour === 12 ? 12 : hour + 12;
  if (p === "siang" || p === "sore" || p === "malam") {
    return hour < 12 ? hour + 12 : hour;
  }
  if (p === "pagi") {
    return hour === 12 ? 0 : hour;
  }
  return hour;
}

function mergeOverlapping(matches: NaturalMatch[]): NaturalMatch[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged: NaturalMatch[] = [];
  for (const m of sorted) {
    const last = merged[merged.length - 1];
    if (last && m.start <= last.end) {
      last.end = Math.max(last.end, m.end);
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

function buildCleanedTitle(text: string, matches: NaturalMatch[]): string {
  if (matches.length === 0) return text.trim();
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const m of sorted) {
    out += text.slice(cursor, m.start);
    cursor = m.end;
  }
  out += text.slice(cursor);
  // Rapikan sisa kata sambung yatim ("di", "pada", "-", dst) & spasi ganda.
  return out
    .replace(/\b(pada|di|on)\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

/**
 * Parse judul task dan cari tanggal/waktu dalam bahasa Indonesia atau Inggris.
 * Tidak melempar error — kalau tidak ketemu apa-apa, `date` bernilai null.
 */
export function parseNaturalDate(rawText: string): NaturalDateResult {
  const text = rawText;
  const dateFound = findDateMatch(text);
  const timeFound = findTimeMatch(text);

  if (!dateFound && !timeFound) {
    return { date: null, hasTime: false, matches: [], cleanedTitle: text.trim() };
  }

  const base = dateFound ? dateFound.date : startOfDay(new Date());
  const result = new Date(base);
  let hasTime = false;
  if (timeFound) {
    result.setHours(timeFound.hour, timeFound.minute, 0, 0);
    hasTime = true;
  }

  const matches = mergeOverlapping(
    [dateFound?.match, timeFound?.match].filter((m): m is NaturalMatch => Boolean(m)),
  );

  return {
    date: result,
    hasTime,
    matches,
    cleanedTitle: buildCleanedTitle(text, matches),
  };
}

/** Format Date lokal → "YYYY-MM-DD" buat <input type="date"> */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format Date lokal → "HH:MM" buat <input type="time"> */
export function toTimeInputValue(d: Date): string {
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${h}:${min}`;
}

// keep referenced so bundlers/linters don't flag unused helper if trimmed later
void stripDiacriticless;
