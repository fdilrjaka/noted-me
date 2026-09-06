import { supabase } from "@/integrations/supabase/client";
import { getScheduleData, setScheduleData, type ScheduleClassRow, type ScheduleData } from "./scheduleStore";

type Row = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */

function classRow(c: ScheduleClassRow, userId: string): Row {
  return {
    id: c.id,
    user_id: userId,
    day: c.day,
    course_name: c.courseName,
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

function buildClass(row: Row): ScheduleClassRow {
  return {
    id: String(row["id"]),
    day: String(row["day"]) as ScheduleClassRow["day"],
    courseName: String(row["course_name"] ?? ""),
    time: String(row["time"] ?? ""),
    room: String(row["room"] ?? ""),
    classType: (row["class_type"] as ScheduleClassRow["classType"]) ?? "online",
    status: (row["status"] as ScheduleClassRow["status"]) ?? "upcoming",
    lmsLinks: Array.isArray(row["lms_links"]) ? (row["lms_links"] as ScheduleClassRow["lmsLinks"]) : [],
    deadline: row["deadline"] == null ? null : String(row["deadline"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: new Date(String(row["updated_at"])).toISOString(),
    dirty: false,
  };
}

// Last-write-wins per baris, sama seperti todo: field jadwal pendek &
// terstruktur, gak butuh dialog konflik kayak isi catatan panjang.
function mergeRemote(local: ScheduleClassRow[], remote: Array<Record<string, unknown>>): ScheduleClassRow[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const row of remote) {
    const incoming = buildClass(row);
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }
    if (existing.dirty && existing.updated_at >= incoming.updated_at) continue;
    byId.set(incoming.id, incoming);
  }
  return [...byId.values()];
}

let running: Promise<void> | null = null;

export function syncScheduleNow(userId: string, opts?: { full?: boolean }): Promise<void> {
  if (running) return running;
  running = doSync(userId, opts?.full ?? false).finally(() => {
    running = null;
  });
  return running;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Jadwal lama mungkin menyimpan id numerik (Date.now) yang ditolak kolom uuid.
// Ganti dengan UUID baru dan tandai dirty supaya ter-upload ulang.
function migrateLegacyIds(data: ScheduleData): ScheduleData {
  if (!data.classes.some((c) => !UUID_RE.test(c.id))) return data;
  const classes = data.classes.map((c) =>
    UUID_RE.test(c.id) ? c : { ...c, id: crypto.randomUUID(), dirty: true as const },
  );
  const next = { ...data, classes };
  setScheduleData(next);
  return next;
}

async function doSync(userId: string, full: boolean) {
  const before = migrateLegacyIds(getScheduleData());
  const since = full ? "1970-01-01T00:00:00.000Z" : (before.lastPull ?? "1970-01-01T00:00:00.000Z");

  const { data: remoteRows, error } = await supabase
    .from("schedule_classes")
    .select("*")
    .gt("updated_at", since);
  if (error) throw error;

  const dirtyClasses = before.classes.filter((c) => c.dirty && UUID_RE.test(c.id));

  if (dirtyClasses.length) {
    const { error: upsertError } = await supabase
      .from("schedule_classes")
      .upsert(dirtyClasses.map((c) => classRow(c, userId)) as any);
    if (upsertError) throw upsertError;
  }

  const pushed = new Map(dirtyClasses.map((c) => [c.id, c.updated_at]));

  const current = getScheduleData();
  const classes = current.classes.map((c) => (pushed.get(c.id) === c.updated_at ? { ...c, dirty: false } : c));

  const next: ScheduleData = {
    classes: mergeRemote(classes, remoteRows ?? []),
    lastPull: new Date(Date.now() - 5000).toISOString(),
  };

  setScheduleData(next);
}
