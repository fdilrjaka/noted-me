import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://noteme.test/" });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const dc = await import(`${ROOT}/src/storage/local/dataCore.ts`);
const st = await import(`${ROOT}/src/storage/local/subjectStore.ts`);
let writes = 0;
const orig = dom.window.Storage.prototype.setItem;
dom.window.Storage.prototype.setItem = function (k: string, v: string) {
  if (k === "noteme.data.v1") writes++;
  return orig.call(this, k, v);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const saved = () => {
  const raw = dom.window.localStorage.getItem("noteme.data.v1");
  return raw ? JSON.parse(raw).subjects.length : 0;
};
let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
dc.loadLocal();
writes = 0;
const s0 = performance.now();
for (let i = 0; i < 200; i++) st.createSubject("MK " + i);
const burst = performance.now() - s0;
t(`200 perubahan beruntun -> jumlah tulis localStorage seketika: ${writes}`, writes === 0, writes);
t("state di memori langsung benar", dc.getData().subjects.length === 200);
await sleep(450);
t(
  `setelah jeda: hanya ${writes} tulisan (bukan 200) dan isi lengkap`,
  writes === 1 && saved() === 200,
  [writes, saved()],
);
console.log(`   (200 perubahan beruntun memakan ${burst.toFixed(0)} ms di main thread)`);
{
  writes = 0;
  st.createSubject("terakhir");
  dom.window.dispatchEvent(new dom.window.Event("pagehide"));
  t("pagehide -> langsung ditulis tanpa menunggu timer", saved() === 201 && writes === 1, [
    saved(),
    writes,
  ]);
  st.createSubject("saat tab disembunyikan");
  Object.defineProperty(dom.window.document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  t("visibilitychange(hidden) -> langsung ditulis", saved() === 202, saved());
  // muat ulang modul = simulasi reload: data harus utuh
  const raw = dom.window.localStorage.getItem("noteme.data.v1")!;
  t("data utuh untuk reload", JSON.parse(raw).subjects.length === 202);
}
process.exit(fail ? 1 : 0);
