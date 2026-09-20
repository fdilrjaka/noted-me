let fail = 0;
const t = (name: string, ok: boolean, detail: unknown = "") => {
  if (!ok) {
    fail++;
    console.log("FAIL", name, JSON.stringify(detail)?.slice(0, 300));
  } else console.log("ok  ", name);
};
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "https://noteme.test/",
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
g.CustomEvent = dom.window.CustomEvent;
g.HTMLElement = dom.window.HTMLElement;
g.IS_REACT_ACT_ENVIRONMENT = true;
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
g.React = React;
const { act } = React as any;
const fake = await import("./fakes/supabase.ts");
const { SyncStatus } = await import(`${ROOT}/src/components/noteme/SyncEngine.tsx`);
const { createSubject } = await import(`${ROOT}/src/storage/local/subjectStore.ts`);
const { createPage, patchPage } = await import(`${ROOT}/src/storage/local/pageStore.ts`);
const { getData } = await import(`${ROOT}/src/storage/local/dataCore.ts`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(React.createElement(SyncStatus));
});

// Fase 1: idle, tidak ada edit. Sync seharusnya cuma jalan sekali (sync awal) lalu diam.
await act(async () => {
  await sleep(4500);
});
const idleSyncs = fake.calls.byTable["pages"] ?? 0;

// Fase 2: satu edit lokal -> harus ke-push, lalu diam lagi.
fake.resetCalls();
await act(async () => {
  const sid = createSubject("MK Uji");
  createPage(sid, "Pertemuan 1");
});
await act(async () => {
  await sleep(4500);
});
const editSyncs = fake.calls.byTable["pages"] ?? 0;
const pushed = fake.db.tables["pages"]?.size ?? 0;
const stillDirty = getData().pages.filter((p: any) => p.dirty).length;

// Kode lama menjalankan sync tanpa henti tiap ~1,2 detik (>= 3 siklus dalam jendela ini).
t("idle: hanya satu sync awal, tidak berputar terus", idleSyncs === 1, idleSyncs);
t("satu edit lokal memicu tepat satu sync", editSyncs === 1, editSyncs);
t("edit terkirim ke server dan tidak lagi dirty", pushed >= 1 && stillDirty === 0, {
  pushed,
  stillDirty,
});
process.exit(fail ? 1 : 0);
