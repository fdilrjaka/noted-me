# NoteMe

Aplikasi catatan kuliah **offline-first**: mata kuliah, halaman per pertemuan, editor dengan tabel dan
gambar, To Do, jadwal kuliah, tempat sampah, ekspor/impor, dan sinkronisasi antar perangkat lewat akun.
Catatan tetap bisa dibuka dan diedit tanpa jaringan; akun hanya dibutuhkan untuk sinkronisasi.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://noted-me.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e30382a3-c099-4eca-9404-e427eb950a87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

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

| Variabel                                              | Dipakai di | Keterangan                                                                      |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`  | browser    | Klien Supabase                                                                  |
| `VITE_SUPABASE_PROJECT_ID`                            | browser    | Id proyek                                                                       |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`            | server     | Verifikasi token dan cek password di server function                            |
| `SUPABASE_SERVICE_ROLE_KEY` **(rahasia)**             | server     | Mengganti password lewat kode pemulihan; melewati RLS, jangan pernah ke browser |
| `LOVABLE_CRON_SECRET`, `LOVABLE_CRON_SECRET_PREVIOUS` | server     | Opsional, autentikasi endpoint cron                                             |

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
  integrations/      Klien Supabase (digenerate Lovable, jangan diedit langsung)
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

## Catatan lockfile

Ada dua lockfile: `package-lock.json` (npm, dipakai README dan CI) dan `bun.lock` (dikelola Lovable;
berisi URL registry privat Lovable sehingga tidak bisa dipasang dari luar). Keduanya sengaja
dibiarkan; jangan hapus salah satunya tanpa memastikan alur Lovable Anda.
