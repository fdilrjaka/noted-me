import { supabase } from "@/integrations/supabase/client";
import { dirtyCount } from "@/storage/local/dataCore";
import { syncNow } from "@/storage/sync-engine/syncNow";
import { dirtyTodoCount } from "@/lib/noteme/todoStore";
import { syncTodoNow } from "@/lib/noteme/todoSync";
import { dirtyScheduleCount, getScheduleData } from "@/lib/noteme/scheduleStore";
import { syncScheduleNow } from "@/lib/noteme/scheduleSync";

/**
 * Sinkron semua data (catatan, todo, jadwal) lalu keluar. Kalau masih ada perubahan yang
 * gagal terkirim (offline, konflik yang belum diputuskan), tanya dulu — perubahan itu hanya
 * ada di perangkat ini dan akan hilang kalau akun lain login di sini setelahnya.
 * Return false kalau user membatalkan keluar.
 */
export async function syncAndSignOut(userId: string): Promise<boolean> {
  await Promise.allSettled([syncNow(userId), syncTodoNow(userId), syncScheduleNow(userId)]);

  const pending = dirtyCount() + dirtyTodoCount() + dirtyScheduleCount(getScheduleData());
  if (
    pending > 0 &&
    !window.confirm(
      `${pending} perubahan belum tersinkron ke server dan hanya ada di perangkat ini. ` +
        "Tetap keluar? Perubahan itu bisa hilang kalau akun lain masuk di perangkat ini.",
    )
  ) {
    return false;
  }
  await supabase.auth.signOut();
  return true;
}
