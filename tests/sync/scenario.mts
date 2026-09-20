import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://noteme.test/" });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const NEW = true;
const SC = process.env.SCENARIO!;
const fake = await import("../fakes/supabase.ts");
const { syncNow } = await import(`${ROOT}/src/storage/sync-engine/syncNow.ts`);
const dc = await import(`${ROOT}/src/storage/local/dataCore.ts`);
const { syncScheduleNow } = await import(`${ROOT}/src/lib/noteme/scheduleSync.ts`);
const sched = await import(`${ROOT}/src/lib/noteme/scheduleStore.ts`);
const iso = (ms: number) => new Date(ms).toISOString();
const pageRow = (i: number, user = "A", updated = iso(Date.parse("2026-09-01T00:00:00Z") + i)) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  user_id: user,
  subject_id: "00000000-0000-4000-8000-00000000ffff",
  title: `p${i}`,
  content: `<p>isi ${i}</p>`,
  pinned: false,
  position: i,
  deleted: false,
  updated_at: updated,
});
let res: any = { scenario: SC };

if (SC === "pagination") {
  for (let i = 1; i <= 1200; i++) fake.seedServerRow("pages", pageRow(i));
  await syncNow("A", { full: true });
  res.serverRows = 1200;
  res.pulledToDevice = dc.getData().pages.length;
}
if (SC === "clockskew") {
  await syncNow("A", { full: true }); // perangkat B sudah sync, kursor terbentuk
  await new Promise((r) => setTimeout(r, 30));
  // Perangkat lain (jam mundur ke 2020) menulis baris; server memberi timestamp server-nya sendiri.
  fake.seedServerRow("pages", pageRow(1, "A", "2020-01-01T00:00:00.000Z"));
  await syncNow("A"); // sync inkremental biasa
  res.rowWithPastClientClockPulled = dc.getData().pages.some((p: any) => p.id === pageRow(1).id);
}
if (SC === "nomigration") {
  fake.db.hasServerColumn = false; // migrasi belum dijalankan
  fake.seedServerRow("pages", pageRow(1));
  fake.seedServerRow("pages", pageRow(2));
  await syncNow("A", { full: true });
  const first = dc.getData().pages.length;
  fake.seedServerRow("pages", pageRow(3, "A", iso(Date.now() + 1000)));
  await syncNow("A");
  res.pulledOnFirstSync = first;
  res.pulledAfterSecondSync = dc.getData().pages.length;
}
if (SC === "schedule-race") {
  sched.createClass({
    day: "senin",
    courseName: "Kalkulus",
    time: "08:00",
    room: "R1",
    classType: "lecture",
    status: "upcoming",
    lmsLinks: [],
  });
  const id = sched.getScheduleData().classes[0].id;
  // User mengedit kelas yang SAMA selagi request upsert sedang berjalan.
  fake.db.onUpsert = () => {
    sched.updateClass(id, { room: "R2-diedit-saat-sync" });
  };
  await syncScheduleNow("A");
  const c = sched.getScheduleData().classes.find((x: any) => x.id === id);
  res.editedDuringSync = c.room;
  res.stillMarkedDirty = c.dirty;
}
if (SC === "cross-account") {
  // Akun A pernah login di perangkat ini; catatannya masih ada (dirty) di localStorage.
  const sid = dc.getData
    ? (await import(`${ROOT}/src/storage/local/subjectStore.ts`)).createSubject("Rahasia Akun A")
    : "";
  if (NEW) {
    const lo = await import(`${ROOT}/src/storage/local/localOwner.ts`);
    await lo.ensureLocalOwner("A");
  } else {
    /* kode asli tidak punya konsep pemilik */
  }
  // Sekarang akun B login di perangkat yang sama.
  if (NEW) {
    const lo = await import(`${ROOT}/src/storage/local/localOwner.ts`);
    res.promptWouldShow = lo.localDataBelongsToOther("B");
    await lo.ensureLocalOwner("B");
  }
  await syncNow("B", { full: true });
  const rows = [...(fake.db.tables["subjects"]?.values() ?? [])];
  res.subjectsLeakedIntoAccountB = rows.filter((r: any) => r.user_id === "B").length;
  res.localSubjectsVisibleToB = dc.getData().subjects.length;
}
if (SC === "guest-adopt" && NEW) {
  (await import(`${ROOT}/src/storage/local/subjectStore.ts`)).createSubject("Catatan tamu");
  const lo = await import(`${ROOT}/src/storage/local/localOwner.ts`);
  await lo.ensureLocalOwner("A");
  res.guestNotesKeptAfterFirstLogin = dc.getData().subjects.length;
  await lo.ensureLocalOwner("A");
  res.stillKeptForSameAccount = dc.getData().subjects.length;
}

const { syncTodoNow } = await import(`${ROOT}/src/lib/noteme/todoSync.ts`);
const todo = await import(`${ROOT}/src/lib/noteme/todoStore.ts`);
const tid = (i: number) => `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const secRow = (i: number, title: string, updated: string) => ({
  id: tid(i),
  user_id: "A",
  category_id: "cat",
  name: title,
  position: 0,
  deleted: false,
  updated_at: updated,
});
if (SC === "todo-remote-newer") {
  // Perangkat ini punya edit dirty (jam 10:00); perangkat lain sudah mengubah baris yang sama lebih baru (jam 11:00).
  todo.setTodoData({
    sections: [
      {
        id: tid(1),
        category_id: "cat",
        name: "edit lokal lama",
        position: 0,
        deleted: false,
        updated_at: "2026-09-19T10:00:00.000Z",
        dirty: true,
      },
    ],
    tasks: [],
    lastPull: null,
  });
  fake.seedServerRow(
    "todo_sections",
    secRow(1, "edit di perangkat lain (lebih baru)", "2026-09-19T11:00:00.000Z"),
  );
  await syncTodoNow("A", { full: true });
  res.serverTitle = [...fake.db.tables["todo_sections"].values()][0].name;
  res.localTitle = todo.getTodoData().sections[0].name;
  res.pushedByThisDevice = fake.calls.upsert;
}
if (SC === "todo-local-newer") {
  todo.setTodoData({
    sections: [
      {
        id: tid(1),
        category_id: "cat",
        name: "edit lokal baru",
        position: 0,
        deleted: false,
        updated_at: "2026-09-19T12:00:00.000Z",
        dirty: true,
      },
    ],
    tasks: [],
    lastPull: null,
  });
  fake.seedServerRow("todo_sections", secRow(1, "versi server lama", "2026-09-19T11:00:00.000Z"));
  await syncTodoNow("A", { full: true });
  res.serverTitle = [...fake.db.tables["todo_sections"].values()][0].name;
  res.localTitle = todo.getTodoData().sections[0].name;
  res.stillDirty = todo.getTodoData().sections[0].dirty;
}
if (SC === "todo-stale-echo") {
  // Baris lokal baru saja di-push (bersih), tapi salinan server LAMA sempat ikut ditarik.
  todo.setTodoData({
    sections: [
      {
        id: tid(1),
        category_id: "cat",
        name: "versi terbaru lokal",
        position: 0,
        deleted: false,
        updated_at: "2026-09-19T12:00:00.000Z",
        dirty: false,
      },
    ],
    tasks: [],
    lastPull: null,
  });
  fake.seedServerRow("todo_sections", secRow(1, "salinan server lama", "2026-09-19T11:00:00.000Z"));
  await syncTodoNow("A", { full: true });
  res.localTitle = todo.getTodoData().sections[0].name;
}
console.log(JSON.stringify(res));
process.exit(0);
