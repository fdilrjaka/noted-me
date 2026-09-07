# Progress Restrukturisasi NoteMe

Status per tahap (lihat urutan pengerjaan yang disepakati):

## ✅ Tahap 1 — Shared/utils (SELESAI)
- `src/shared/utils/naturalDate.ts`
- `src/shared/theme/theme.ts`
- `src/shared/ui/*` (semua komponen shadcn/ui)
- Semua import sudah diperbaiki ke path baru.

## ✅ Tahap 2 — Storage lokal (SELESAI)
`src/lib/noteme/store.ts` (430 baris) sudah dipecah & DIHAPUS, digantikan:
- `src/storage/local/dataCore.ts` — state inti, tipe, selectors, search
- `src/storage/local/subjectStore.ts` — CRUD Subject
- `src/storage/local/pageStore.ts` — CRUD Page + emptyTrash
- `src/storage/local/imageMetaStore.ts` — metadata NoteImage
- `src/storage/local/imagePurge.ts` — helper hapus blob gambar (dipakai subject & page store)
- `src/storage/local/imageStore.ts` — (dipindah apa adanya dari lib/noteme/imageStore.ts)

Semua import di `SyncEngine.tsx`, `Editor.tsx`, `auth.tsx`, `index.tsx`,
`subject.$subjectId.tsx`, `trash.tsx` sudah diperbaiki ke path baru.

## ✅ Tahap 3 — Import/Export (SELESAI)
`src/lib/noteme/backup.ts` (494 baris) sudah dipecah & DIHAPUS, digantikan:
- `src/import-export/shared.ts` — helper bersama (download, base64, collectImagesForPages)
- `src/import-export/backupExport.ts` — export JSON & Markdown
- `src/import-export/backupImport.ts` — import backup JSON
- `src/import-export/formatConverters.ts` — export PDF (html2canvas + jsPDF)

Import di `settings.tsx` & `subject.$subjectId.tsx` sudah diperbaiki.

## ✅ Tahap 4 — Storage remote / sync (SELESAI)
`src/lib/noteme/sync.ts` (502 baris) sudah dipecah & DIHAPUS, digantikan:
- `src/storage/remote/rowMappers.ts` — konversi row Supabase <-> tipe lokal
- `src/storage/remote/imageSync.ts` — upload blob gambar ke Storage
- `src/storage/remote/versionTracker.ts` — baseline versi page yang sudah ke-sync
- `src/storage/remote/conflictResolver.ts` — `PageConflict`, `getConflicts`,
  `setConflicts`, `upsertConflicts`, `useConflicts`, `mergePageContent`,
  `diffPageContent`, `resolveConflict`
- `src/storage/sync-engine/syncNow.ts` — orkestrator utama: `mergeRemote`, `syncNow`,
  `doSync`. Akses konflik di dalam `doSync` sudah pakai `getConflicts()`/`setConflicts()`
  dari conflictResolver.ts, bukan variabel modul langsung.

Import di `SyncEngine.tsx` (`resolveConflict`, `useConflicts`, `diffPageContent` dari
conflictResolver.ts; `syncNow` dari sync-engine/syncNow.ts) dan `auth.tsx` (`syncNow`)
sudah diperbaiki ke path baru.

`npx tsc --noEmit` dan `eslint` sudah dijalankan bersih di file-file yang diubah/dibuat.
**Belum dites manual di browser** (login real + 2 tab + dialog konflik) — disarankan
dites sebelum lanjut ke Tahap 5, sesuai catatan "PENTING" di bawah.

## ⏳ Tahap 5 — Pecah komponen halaman besar (BELUM DIMULAI)
Target utama:
- `src/routes/index.tsx` (898 baris, komponen `Dashboard()`) → pecah ke
  `src/features/dashboard/` (hooks: useSelection, useDragAndDrop, useComposer,
  useFolderView; components: SearchBar, NotificationPanel)
- `src/routes/todo.tsx` (759 baris)
- `src/routes/subject.$subjectId.tsx` (558 baris, sudah lebih kecil dari tadinya
  setelah Tahap 2-3, tapi masih bisa dipecah lagi kalau perlu)
- `src/routes/schedule.tsx`, `settings.tsx`, `auth.tsx`, `trash.tsx` → masing-masing
  ke `src/features/<nama>/`

## ⏳ Tahap 6 — routes/ jadi pintu masuk tipis (BELUM DIMULAI)
Setelah Tahap 5 selesai, isi `src/routes/*.tsx` diringkas jadi cuma import
komponen dari `src/features/*`.

---
**PENTING:** jangan hapus `src/lib/noteme/sync.ts` sampai Tahap 4 di atas
benar-benar tuntas dan sudah dites jalan — itu satu-satunya bagian yang
kalau salah pecah bisa bikin data note ke-overwrite/hilang.
