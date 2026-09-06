import { supabase } from "@/integrations/supabase/client";
import { getScheduleData, setScheduleData, type ScheduleClassRow, type ScheduleData } from "./scheduleStore";

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

function buildClass(row: Row): ScheduleClassRow {
  return {
    id: String(row["id"]),
    day: String(row["day"]) as ScheduleClassRow["day"],
    courseName: String(row["course_name"] ?? ""),
    lecturer: String(row["lecturer"] ?? "Dr. Andi Wijaya"),
    time: String(row["time"] ?? ""),
    room: String(row["room"] ?? ""),
    classType: (row["class_type"] as ScheduleClassRow["classType"]) ?? "online",
    status: (row["status"] as ScheduleClassRow["status"]) ?? "upcoming",
    lmsLinks: Array.isArray(row["lms_links"]) ? (row["lms_links"] as ScheduleClassRow["lmsLinks"]) : [],
    deadline: row["deadline"] == null ? null : String(row["deadline"]),
    position: Number(row["position"] ?? 0),
    deleted: Boolean(row["deleted"]),
    updated_at: String(row["updated_at"] ?? new Date().toISOString()),
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

export async function syncScheduleWithSupabase(userId: string, full = false) {
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

  const localMap = new Map(before.classes.map((c) => [c.id, c]));

  if (remoteRows) {
    for (const r of remoteRows) {
      const incoming = buildClass(r as Row);
      const existing = localMap.get(incoming.id);
      if (!existing || new Date(incoming.updated_at) > new Date(existing.updated_at)) {
        localMap.set(incoming.id, incoming);
      }
    }
  }

  const nextClasses = Array.from(localMap.values()).map((c) => ({ ...c, dirty: false }));
  setScheduleData({ classes: nextClasses, lastPull: new Date().toISOString() });
}
