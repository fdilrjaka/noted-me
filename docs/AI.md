# AI Chat (`/ai`)

Halaman chat AI di NoteMe, tersambung ke gateway berformat OpenAI (`/v1/chat/completions`).
Bisa melampirkan file (teks, PDF, DOCX), gambar, dan halaman catatan; jawaban bisa disimpan
sebagai halaman catatan baru.

## Cara kerja

```
Browser ──(server function, wajib login)──> Cloudflare Worker ──> Gateway AI
 /ai          sendAiChat / generateAiTitle      kunci API ada di sini
```

- Kunci gateway **hanya ada di server** (`process.env`). Browser tidak pernah melihatnya.
- Server function memakai `requireSupabaseAuth`: hanya user yang login yang bisa memanggil AI.
  Mode "lanjut tanpa akun" tidak bisa memakai AI.
- File dibaca **di browser** (PDF dengan `pdfjs-dist`, DOCX dengan `mammoth`), lalu teksnya dikirim
  sebagai blok `<lampiran nama="...">`. Prompt sistem memberi tahu model bahwa isinya data, bukan
  instruksi.
- Gambar dikecilkan (sisi terpanjang 1600 px) dan dikompres ke JPEG sebelum dikirim sebagai
  `image_url` base64.
- Gateway tidak streaming: satu giliran = satu request yang ditunggu sampai selesai (batas 90 detik).

## Setup

Isi tiga variabel server (lihat `.env.example`):

| Variabel         | Contoh                    | Keterangan                                         |
| ---------------- | ------------------------- | -------------------------------------------------- |
| `AI_GATEWAY_URL` | `https://gateway-kamu/v1` | Base URL, atau URL lengkap `.../chat/completions`  |
| `AI_GATEWAY_KEY` | `sk-...`                  | **Rahasia.** Kunci API dari penjual gateway        |
| `AI_MODEL`       | `nama-model-dari-gateway` | Persis seperti yang ditulis di dokumentasi gateway |

Lokal: taruh di `.dev.vars` atau `.env.local` (sudah di-ignore git).

Production (Cloudflare Workers):

```sh
npx wrangler secret put AI_GATEWAY_KEY
npx wrangler secret put AI_GATEWAY_URL
npx wrangler secret put AI_MODEL
```

Setelah itu buka menu **AI Chat** di sidebar (atau kartu AI di Explore pada ponsel).

> Parameter token: kode mengirim `max_tokens`. Kalau gateway menolak dan meminta
> `max_completion_tokens`, server otomatis mengulang sekali dengan parameter itu.

## Membuat file (Word, PDF, Excel)

Cukup minta di chat, misalnya "buatkan laporan praktikum dalam Word" atau "buat tabel nilai di Excel".
Jawaban AI akan memuat kartu file dengan tombol **Unduh**.

Cara kerja (tanpa function calling, jadi cocok dengan gateway apa pun):

1. `FILE_PROMPT` di `chat.server.ts` mengajari model menulis satu blok ` ```noteme-file ` berisi JSON:
   `{"format":"docx|pdf|xlsx","filename":"...","content":"<Markdown>"}`, atau untuk Excel
   `"sheets":[{"name":"...","rows":[[...]]}]`.
2. `lib/fileSpec.ts` mengambil blok itu dari jawaban, memvalidasi, dan menyembunyikannya dari teks.
3. Saat tombol ditekan, browser membuat file: `buildDocx.ts` (`docx`), `buildPdf.ts` (`jspdf`, teks asli
   bukan screenshot), `buildXlsx.ts` (`exceljs`, header tebal, freeze baris pertama, rumus didukung).
   Library dimuat dinamis, jadi tidak membebani halaman lain.

Batas: 4 file per jawaban, 120.000 karakter dokumen, 10 lembar, 5.000 baris x 60 kolom per lembar.
`max_tokens` dinaikkan ke 6000 agar dokumen tidak terpotong.

### Panel kanan (seperti artifact di Claude)

Kartu file di jawaban membuka **panel kanan** (di HP: layar penuh). Panel terbuka otomatis saat AI
selesai membuat file, dan bisa ditutup dengan tombol X atau `Esc`.

- **Pratinjau**: dokumen tampil seperti kertas; Excel tampil sebagai grid (huruf kolom, nomor baris,
  tab lembar). Rumus tampil sebagai teks miring; Excel menghitungnya saat file dibuka.
- **Edit**: ubah Markdown dokumen, nama file, atau sel Excel langsung di panel (angka tetap angka;
  desimal koma diterima). Hasil edit ikut terunduh. Tombol **Kembalikan** memulihkan isi dari AI.
- **PDF asli** (khusus PDF): menampilkan PDF yang benar-benar akan diunduh. Sebagian browser HP hanya
  menampilkan halaman pertama; pakai "Buka di tab baru".
- **Versi**: kalau AI membuat ulang file dengan nama yang sama, muncul pemilih "Versi 1 / 2 (terbaru)".
- **Unduh** + menu format lain: Word, PDF, Markdown; untuk Excel juga CSV (lembar aktif) dan
  Word/PDF (lembar jadi tabel).
- **Salin** (Excel: salin lembar, bisa ditempel ke Excel), **Simpan ke catatan**, dan lebar panel bisa
  digeser di desktop.

Catatan: hasil edit hanya hidup selama halaman terbuka (tidak ikut riwayat chat); yang tersimpan di
riwayat tetap versi dari AI. Kode: `components/ArtifactPanel.tsx`, `SheetGrid.tsx`, `lib/artifacts.ts`,
`lib/exportFile.ts`.

Keterbatasan: PDF memakai font bawaan, jadi hanya huruf Latin yang tampil (emoji dibuang, aksara lain
jadi `?`); Word/Excel tidak punya batasan itu. Jawaban yang terpotong tidak menghasilkan file dan UI
menyarankan "Ulangi". Model yang kurang patuh format bisa sesekali gagal; coba ulangi.

## Skill lewat mention (`@template`)

Tulis `@template` di pesan untuk mengaktifkan aturan UI anti-template (pembuka: "SKILL @template
AKTIF"). Cocok untuk meminta menulis atau mereview kode tampilan: komponen, halaman, modal, sidebar.

- Server menambahkan teks skill ke prompt sistem **hanya** kalau ada mention. Tanpa mention, prompt
  sama seperti biasa dan kuota tidak terpakai untuk skill (teksnya sekitar 13.000 karakter).
- Mention dibaca dari pesan **pengguna** saja. `@template` di dalam isi lampiran atau di jawaban AI
  tidak dihitung; `@templates`, `@template-v2`, dan `a@template.com` juga bukan panggilan.
- Skill tetap aktif selama mention-nya masih ada di riwayat yang dikirim ke model (16 pesan
  terakhir), jadi lanjutan seperti "ubah lagi tombolnya" tidak perlu menulis `@template` ulang.
- Model tidak punya akses ke repo: ia bekerja dari kode atau screenshot yang kamu kirim.

Kode: `lib/skillMention.ts` (pendeteksi, aman di klien), `skills.server.ts` (teks skill, hanya server),
`buildSystemPrompt` di `chat.server.ts`, dipakai `chat.functions.ts`. Mengubah aturannya: edit
`skills.server.ts`. Menambah skill lain: tambah id di `SKILL_MENTIONS` dan `PATTERNS`, teksnya di
`skills.server.ts`, dan cabangnya di `buildSystemPrompt`. Tes: `tests/skills.test.mts`.

## Batas

| Hal                           | Batas                                 |
| ----------------------------- | ------------------------------------- |
| Lampiran per pesan            | 5 (maks. 4 gambar)                    |
| Ukuran file                   | 15 MB                                 |
| Teks per lampiran             | 30.000 karakter (sisanya dipotong)    |
| Total teks lampiran per pesan | 100.000 karakter                      |
| Halaman PDF yang dibaca       | 80 halaman pertama                    |
| Riwayat yang dikirim ke model | 16 pesan terakhir / ±120.000 karakter |

Gambar lama tidak dikirim ulang di setiap giliran: hanya gambar dari pesan terbaru yang punya
gambar yang ikut, supaya payload tidak membengkak.

## Keterbatasan yang perlu diketahui

- **Tidak ada batas pemakaian per user.** Siapa pun yang punya akun bisa memakai kuota gateway-mu.
  Pantau pemakaian di dashboard penyedia gateway. Kalau nanti perlu batas, tambahkan di
  `chat.functions.ts` sebelum memanggil `callGateway`.
- **Batal itu sisi-klien.** Jawaban yang telat datang diabaikan, tapi server tetap bisa menyelesaikan
  request ke gateway (dan kuota tetap terpakai).
- **Riwayat chat tersimpan lokal** (IndexedDB, per akun), tidak ikut sinkronisasi antar perangkat.
  Gambar tidak disimpan di riwayat, hanya nama file-nya.
- **HEIC** hanya terbaca di browser yang bisa membukanya (Safari). Di Chrome, ubah ke JPG/PNG dulu.
- **PDF hasil scan** (tanpa lapisan teks) tidak terbaca; kirim sebagai gambar.
- **Membaca** `.doc`, `.xls(x)`, `.ppt(x)` belum didukung. Simpan sebagai PDF, DOCX, atau CSV.
- Markdown di jawaban didukung versi ringkas (judul, daftar satu tingkat, tabel, kode, kutipan,
  tautan). Daftar bersarang diratakan.
- Privasi: isi catatan dan file yang dilampirkan dikirim ke gateway pihak ketiga. Pastikan
  penyedia gateway sesuai dengan kebutuhanmu, dan cek apakah ia mengizinkan satu kunci dipakai
  banyak orang.

## Pemecahan masalah

| Pesan di UI                                 | Penyebab / solusi                                        |
| ------------------------------------------- | -------------------------------------------------------- |
| "AI belum diaktifkan di server"             | Salah satu dari tiga variabel di atas belum di-set       |
| "Gateway menolak kunci API (401)"           | `AI_GATEWAY_KEY` salah atau kedaluwarsa                  |
| "Endpoint atau model tidak ditemukan (404)" | Cek `AI_GATEWAY_URL` dan `AI_MODEL`                      |
| "Balasan gateway bukan JSON"                | URL mengarah ke halaman web, bukan API chat              |
| "Permintaan terlalu besar (413)"            | Kurangi lampiran atau jumlah gambar                      |
| "Batas request atau kuota gateway (429)"    | Kuota gateway habis atau terlalu cepat                   |
| "Gateway terlalu lama menjawab"             | Lebih dari 90 detik; persingkat pertanyaan atau lampiran |

## Tes

```sh
npm run test:setup && npm test
```

`tests/ai.test.mts` menguji logika murni (URL gateway, retry parameter token, validasi,
penyusun riwayat, keamanan Markdown). `tests/ai.ui.test.mts` merender halaman `/ai` di jsdom dengan
server function palsu (kirim, galat + kirim ulang, batal, lampiran, riwayat, simpan ke catatan).
