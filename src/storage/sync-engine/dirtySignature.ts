import type { Data } from "@/storage/local/dataCore";
import type { TodoData } from "@/lib/noteme/todoStore";
import type { ScheduleData } from "@/lib/noteme/scheduleStore";

/**
 * Sidik jari dari SEMUA baris yang menunggu di-push (id + versi `updated_at`-nya) di tiga store.
 *
 * Dipakai SyncEngine sebagai pemicu auto-sync, menggantikan pemicu "objek data berubah".
 * Masalah pemicu lama: setiap sync selesai, doSync memanggil setData(next) dengan objek baru
 * walau isinya sama, sehingga efek yang bergantung pada objek data terpicu lagi dan sync
 * berjalan tanpa henti (tiap ~1,2 detik, selamanya). Sidik jari ini hanya berubah kalau ada
 * edit lokal baru atau setelah baris berhasil terkirim, jadi selesai-sync tidak memicu sync
 * berikutnya. Baris yang tertahan (mis. page konflik yang menunggu keputusan user) punya
 * sidik jari tetap, jadi tidak memicu loop juga.
 */
export function dirtySignature(data: Data, todo: TodoData, schedule: ScheduleData): string {
  const parts: string[] = [];
  for (const s of data.subjects) if (s.dirty) parts.push(`s:${s.id}@${s.updated_at}`);
  for (const p of data.pages) if (p.dirty) parts.push(`p:${p.id}@${p.updated_at}`);
  for (const i of data.images) {
    if (i.dirty) parts.push(`i:${i.id}@${i.updated_at}:${i.storage_path ? 1 : 0}`);
  }
  for (const s of todo.sections) if (s.dirty) parts.push(`ts:${s.id}@${s.updated_at}`);
  for (const t of todo.tasks) if (t.dirty) parts.push(`tt:${t.id}@${t.updated_at}`);
  for (const c of schedule.classes) if (c.dirty) parts.push(`c:${c.id}@${c.updated_at}`);
  return parts.join("|");
}
