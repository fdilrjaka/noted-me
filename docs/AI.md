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
- **`.doc`, `.xls(x)`, `.ppt(x)`** belum didukung. Simpan sebagai PDF, DOCX, atau CSV.
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
