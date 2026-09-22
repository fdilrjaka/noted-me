# NoteMe

Aplikasi catatan kuliah **offline-first**: mata kuliah, halaman per pertemuan, editor dengan tabel dan
gambar, To Do, jadwal kuliah, tempat sampah, ekspor/impor, dan sinkronisasi antar perangkat lewat akun.
Catatan tetap bisa dibuka dan diedit tanpa jaringan; akun hanya dibutuhkan untuk sinkronisasi.

This project was originally scaffolded with [Lovable](https://lovable.dev) and has since been made
standalone: it builds, runs, and deploys entirely outside Lovable.

## Arsitektur

```
GitHub  →  Cloudflare Workers  →  NoteMe App  →  Supabase (Auth, Postgres, Storage, Realtime)
```

Source code tinggal di GitHub, di-deploy sebagai Cloudflare Worker (lewat Nitro), dan backend-nya
adalah project Supabase pribadi. Tidak ada dependency runtime ke Lovable Cloud, Lovable hosting,
Lovable preview, atau telemetry Lovable.

## Stack

React 19, TanStack Start / Router (SSR di Cloudflare Workers lewat Nitro), Tailwind CSS 4, Supabase
(Auth, Postgres, Storage, Realtime), Vite 8, TypeScript.

## Menjalankan lokal

Butuh Node.js 22 dan npm.

```sh
npm ci
npm run dev
```

### Variabel lingkungan

`.env` yang ada di repo hanya berisi kunci publik (publishable). Rahasia jangan di-commit; simpan di
`.env.local` atau `.dev.vars` (keduanya sudah di-ignore git).

| Variabel                                             | Dipakai di | Keterangan                                                                      |
| ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | browser    | Klien Supabase                                                                  |
| `VITE_SUPABASE_PROJECT_ID`                           | browser    | Id proyek                                                                       |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`           | server     | Verifikasi token dan cek password di server function                            |
| `SUPABASE_SERVICE_ROLE_KEY` **(rahasia)**            | server     | Mengganti password lewat kode pemulihan; melewati RLS, jangan pernah ke browser |
| `CRON_SECRET`, `CRON_SECRET_PREVIOUS`                | server     | Opsional, autentikasi endpoint cron (belum dipakai route manapun)               |

Di production (Cloudflare Workers), set variabel di atas lewat Wrangler:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Variabel non-secret (URL, project id, publishable key) bisa masuk ke `[vars]` di `wrangler.json`
(digenerate otomatis oleh Nitro, lihat `nitro.config.ts`) atau di-set lewat dashboard Cloudflare.

## Skrip

| Perintah             | Fungsi                                |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Server pengembangan                   |
| `npm run build`      | Build produksi                        |
| `npm run lint`       | ESLint (termasuk cek format Prettier) |
| `npm run typecheck`  | `tsc --noEmit`                        |
| `npm run format`     | Prettier                              |
| `npm run test:setup` | Pasang dependensi tes (sekali saja)   |
| `npm test`           | Jalankan seluruh tes                  |

## Struktur

```
src/
  routes/            Route TanStack (sebagian besar tipis; logika ada di features/)
  features/          Halaman per fitur: dashboard, subject, todo, schedule, trash, settings, auth
  components/        Komponen bersama (editor, navigasi, SyncEngine)
  storage/
    local/           Penyimpanan lokal: data catatan, gambar (IndexedDB), pemilik data lokal
    remote/          Pull dengan kursor jam server, resolusi konflik, pemetaan baris
    sync-engine/     Alur sync dan pemicunya
  lib/noteme/        Store To Do / jadwal / folder, sanitasi HTML, kebijakan kredensial
  integrations/      Klien Supabase
  import-export/     Ekspor (JSON, Markdown, PDF) dan impor backup
public/              PWA: manifest, ikon, service worker
supabase/migrations/ Skema database
tests/               Tes (punya package.json sendiri)
docs/                Catatan perubahan
```

## Cara kerja data

- **Lokal dulu.** Semua perubahan langsung ke store di memori dan disimpan ke perangkat (localStorage
  untuk catatan, IndexedDB untuk blob gambar). Aplikasi tidak menunggu jaringan.
- **Sinkronisasi.** Saat ada akun, `SyncEngine` menarik perubahan (kursor memakai kolom
  `server_updated_at` yang diisi server, bukan jam perangkat) lalu mendorong baris yang belum
  terkirim. Pemicunya adalah sidik jari baris yang menunggu, bukan setiap perubahan objek data.
- **Konflik.** Isi halaman yang diubah di dua perangkat memunculkan dialog atau digabung otomatis
  tanpa membuang tulisan. To Do dan jadwal memakai versi terbaru menang per baris.
- **Pemilik data lokal.** Catatan tetap ada di perangkat setelah keluar. Kalau akun **lain** masuk di
  perangkat yang sama, data lokal akun sebelumnya dibuang (dengan konfirmasi) sebelum sinkron.
- **Akun.** Username + password (email di balik layar berbentuk `<username>@noteme.app`, tanpa
  verifikasi). Karena itu lupa password ditangani dengan **kode pemulihan sekali pakai**, bukan email.
  Password baru wajib min. 6 karakter dan 1 karakter spesial.

## Database

Migrasi ada di `supabase/migrations/` dan idempoten. Terapkan berurutan; tiga terbaru menambah kolom
`server_updated_at`, tabel kode pemulihan (hanya bisa diakses server), dan bucket `avatars`. Detail
urutan deploy dan keterbatasan ada di [`docs/CATATAN_PERUBAHAN.md`](docs/CATATAN_PERUBAHAN.md).

## Pengujian

```sh
npm run test:setup   # sekali saja: memasang tsx + jsdom di tests/
npm test
```

Tes ada di `tests/` dengan `package.json` dan lockfile sendiri, sehingga dependensinya tidak menyentuh
lockfile proyek utama. Isinya: sanitasi HTML, kebijakan password, kode pemulihan (termasuk pembatasan
percobaan dan balapan), penggabungan konten, skenario sync (paginasi, jam perangkat mundur, kebocoran
antar akun, konflik To Do), perilaku editor, alur daftar/lupa password, service worker, avatar, dan
penulisan localStorage. Tiap file berjalan di proses terpisah dengan Supabase palsu di memori.

Yang **belum** otomatis: integrasi dengan Postgres/PostgREST/Auth sungguhan dan runtime Workers
(sudah diverifikasi manual saat pengembangan, belum ada di CI).

## Deploy ke Cloudflare Workers

Build di-generate oleh Nitro (target `cloudflare-module`, lihat `nitro.config.ts`) dan mengeluarkan
worker siap deploy di `.output/server/`.

```sh
npm run build      # vite build -> .output/server/{index.mjs, wrangler.json}
npm run deploy      # wrangler deploy --config .output/server/wrangler.json
```

Sebelum deploy pertama kali:

1. `npx wrangler login`
2. Set secret server-only: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
3. Setelah domain production tersedia, tambahkan domain tersebut ke **Redirect URLs** / allowed
   origins di Supabase Auth (Authentication → URL Configuration), tanpa menghapus domain lama sampai
   deployment baru terverifikasi.

`npm run cf:dev` menjalankan build lalu `wrangler dev` untuk uji coba mendekati environment Workers
sungguhan secara lokal.

## Catatan lockfile

Hanya `package-lock.json` (npm) yang dipakai untuk instalasi dan CI. Lockfile `bun.lock` (dulunya
dikelola Lovable, menunjuk ke registry privat Lovable) sudah dihapus karena proyek ini tidak lagi
memakai bun/Lovable untuk instalasi dependency.
