# Catatan perubahan (perbaikan kritis + sedang + password)

## Urutan deploy

1. Jalankan tiga migrasi baru (berurutan, semuanya idempoten):
   - `20260919090000_sync_hardening.sql`: kolom `server_updated_at` + trigger + index, realtime publication, bucket `note-images`
   - `20260920090000_recovery_codes.sql`: tabel kode pemulihan + pembatas percobaan (hanya bisa diakses server)
   - `20260920100000_avatars_bucket.sql`: bucket `avatars` + policy per-folder
2. Pastikan environment server punya `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, dan
   `SUPABASE_SERVICE_ROLE_KEY` (dipakai server function pemulihan password).
3. Deploy aplikasi. Kode tetap berjalan (dengan perilaku lama) kalau migrasi belum dijalankan.

## Password

- Password baru (daftar, ganti password, reset) wajib min. 6 karakter dan 1 karakter spesial.
  Login tidak memeriksa aturan ini supaya akun lama tetap bisa masuk.
- Aturan hanya dicek di client dan di server function reset. Untuk memaksanya juga pada API Supabase
  langsung, aktifkan "Password requirements" (symbols) di dashboard Supabase Auth.

## Lupa password = kode pemulihan (bukan email)

Email akun palsu (`<username>@noteme.app`) dan proyek tidak punya layanan email, jadi reset lewat
email tidak akan pernah sampai. Sebagai gantinya: 10 kode sekali pakai, ditampilkan sekali saat daftar,
bisa dibuat ulang di Pengaturan (butuh password saat ini; kode lama hangus). Yang tersimpan hanya
hash PBKDF2. Maks. 5 percobaan salah per username per 15 menit.

Akun yang sudah ada belum punya kode: pengguna perlu membuatnya di Pengaturan setelah login.

## Keterbatasan yang diketahui

- Sesi di perangkat lain tidak otomatis keluar setelah password direset (perilaku Supabase Auth).
- Pembatas percobaan per username, bukan per IP: penyerang bisa mengunci reset korban selama 15 menit.
- Semua catatan masih disimpan di satu key localStorage (penulisan sudah digabung dan ada peringatan
  sebelum kuota penuh, tapi belum dipindah ke IndexedDB).

## Perubahan ringan

- **Lint/format**: 485 masalah format diperbaiki otomatis; sisanya (`prefer-const`, blok `catch` kosong,
  dependensi efek di Editor) dibereskan. `eslint .` kini 0 isu. File `src/integrations/supabase/**`
  (digenerate Lovable) dan `tests/**` dikecualikan dari lint; pola shadcn (varian diekspor bersama
  komponen) dikecualikan dari aturan `react-refresh`.
- **Zoom**: `maximum-scale=1` dihapus dari meta viewport (memblokir pinch-zoom). Sebagai gantinya input di
  iOS dipaksa minimal 16px lewat `src/styles.css` supaya Safari tidak zoom otomatis saat fokus.
- **Ikon PWA**: `icon-512.png` ternyata 816x816 (659 KB) padahal manifest menyebut 512x512; diperkecil ke
  512x512 (226 KB). Ikon maskable sekarang berkas terpisah (`icon-maskable-512.png`, latar penuh, logo di
  zona aman) karena sebelumnya memakai gambar yang sama dengan ikon biasa (cincin putih saat dipotong launcher).
- **Kode mati dihapus**: `src/components/HueSlider.tsx` dan `src/components/noteme/AICommandMenu.tsx`
  (tidak diimpor di mana pun).
- **Tes + CI**: folder `tests/` (dependensi terpisah, lihat README) dan `.github/workflows/ci.yml`
  (lint, typecheck, tes, build). Skrip `typecheck`, `test:setup`, `test` ditambahkan ke `package.json`;
  dependensi dan lockfile proyek utama tidak berubah.
- **README** diganti dengan dokumentasi sebenarnya (bagian Lovable dipertahankan).

## Sengaja tidak diubah

- **Komponen shadcn/ui yang tidak terpakai (46 file)**: tidak masuk bundle (tree-shaking), dan kode yang
  digenerate editor Lovable biasanya mengimpornya; menghapusnya bisa memecahkan build berikutnya.
- **Dependensi yang tidak terpakai**: mengubah `package.json` berarti mengubah `bun.lock`, yang berisi URL
  registry privat Lovable dan tidak bisa diverifikasi di luar Lovable.
- **Nama paket `tanstack_start_ts`**: terkait template Lovable (`.lovable/project.json`) dan nama worker
  hasil build; mengubahnya bisa mengubah target deploy.
- **`.env` di `.gitignore`**: Lovable memang meng-commit `.env` (isinya kunci publik).
- **Foreign key `pages.subject_id` / `note_images.page_id`**: id dibuat di klien dan di-upsert per batch
  tanpa jaminan urutan; FK berisiko menolak baris sah dan memblokir sync.
- **Cabang "mode toolbar" di `BottomNav`** (tombol kuas/tabel/format/media untuk halaman `/subject`):
  tidak pernah dirender (halaman subject tidak memasang `BottomNav`) dan tombolnya tidak punya handler,
  tapi ini fitur mobile yang belum selesai dan tercampur dalam komponen navigasi utama.
- **Baris "segera hadir" di Pengaturan**: keputusan produk, bukan bug.
