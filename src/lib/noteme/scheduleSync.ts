import { supabase } from "@/integrations/supabase/client";
import { decodeCursor, nextCursor, pullChanges } from "@/storage/remote/pull";
import {
  getScheduleData,
  setScheduleData,
  type ScheduleClassRow,
  type ScheduleData,
} from "./scheduleStore";

type Row = Record<string, unknown>;

function classRow(c: ScheduleClassRow, userId: string): Row {
  return {
    id: c.id,
    user_id: userId,
    day: c.day,
    course_name: c.courseName,
    lecturer: c.lecturer,
    time: c.time,
    room: c.room,
    class_type: c.classType,
    status: c.status,
    lms_links: c.lmsLinks,
    deadline: c.deadline,
    position: c.position,
    deleted: c.deleted,
    updated_at: c.updated_at,
  };
}

// Versi + isi baris. `updated_at` saja tidak cukup: dua edit dalam milidetik yang sama
// menghasilkan stempel yang sama walau isinya beda.
function rowSignature(c: ScheduleClassRow): string {
  return JSON.stringify([
    c.updated_at,
    c.day,
    c.courseName,
    c.lecturer,
    c.time,
    c.room,
    c.classType,
    c.status,
    c.lmsLinks,
    c.deadline,
    c.position,
    c.deleted,
  ]);
}

function toIso(value: unknown): string {
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function buildClass(row: Row): ScheduleClassRow {
  return {
    id: String(row["id"]),
    day: String(row["day"]) as ScheduleClassRow["day"],
    courseName: String(row["course_name"] ?? ""),
    lecturer: String(row["lecturer"] ?? ""),
    time: String(row["time"] ?? ""),
    room: String(row["room"] ?? ""),
    classType: (row["class_type"] as ScheduleClassRow["classType"]) ?? "online",
    status: (row["status"] as ScheduleClassRow["status"]) ?? "upcoming",
    lmsLinks: Array.isArray(row["lms_links"])
      ? (row["lms_links"] as ScheduleClassRow["lmsLinks"])
      : [],
    deadline: row["deadline"] == null ? null : String(row["deadline"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: toIso(row["updated_at"]),
    dirty: false,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function migrateLegacyIds(data: ScheduleData): ScheduleData {
  if (!data.classes.some((c) => !UUID_RE.test(c.id))) return data;
  const classes = data.classes.map((c) =>
    UUID_RE.test(c.id) ? c : { ...c, id: crypto.randomUUID(), dirty: true as const },
  );
  const next = { ...data, classes };
  setScheduleData(next);
  return next;
}

let running: Promise<void> | null = null;

export function syncScheduleNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = syncScheduleWithSupabase(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

export async function syncScheduleWithSupabase(userId: string, full = false) {
  const before = migrateLegacyIds(getScheduleData());
  const since = full ? "1970-01-01T00:00:00.000Z" : decodeCursor(before.lastPull);

  const pulled = await pullChanges("schedule_classes", since);

  const dirtyClasses = before.classes.filter((c) => c.dirty && UUID_RE.test(c.id));

  if (dirtyClasses.length) {
    const { error: upsertError } = await supabase
      .from("schedule_classes")
      .upsert(dirtyClasses.map((c) => classRow(c, userId)) as never);
    if (upsertError) throw upsertError;
  }

  const pushed = new Map(dirtyClasses.map((c) => [c.id, rowSignature(c)]));

  // PENTING: pakai state TERBARU, bukan `before`. User bisa mengedit jadwal selagi request di
  // atas berjalan; dulu semua baris otomatis ditandai bersih di sini, jadi edit yang terjadi
  // di jendela itu tidak pernah terkirim. Sekarang cuma baris yang isinya persis sama dengan
  // yang barusan dikirim yang ditandai bersih.
  const current = getScheduleData();
  const localMap = new Map<string, ScheduleClassRow>(
    current.classes.map((c) => {
      const pushedAt = pushed.get(c.id);
      return [c.id, pushedAt != null && pushedAt === rowSignature(c) ? { ...c, dirty: false } : c];
    }),
  );

  for (const r of pulled.rows) {
    const incoming = buildClass(r);
    const existing = localMap.get(incoming.id);
    if (!existing) {
      localMap.set(incoming.id, incoming);
      continue;
    }
    // Edit lokal yang belum terkirim tidak boleh ditimpa data lama dari server; ia akan
    // ke-push di sync berikutnya.
    if (existing.dirty) continue;
    if (Date.parse(incoming.updated_at) > Date.parse(existing.updated_at)) {
      localMap.set(incoming.id, incoming);
    }
  }

  setScheduleData({
    classes: Array.from(localMap.values()),
    lastPull: nextCursor(before.lastPull, [pulled]),
  });
}
