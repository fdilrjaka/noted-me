const SRC = new URL("../src", import.meta.url).pathname;
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://noteme.test/" });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
const dc = await import(`${SRC}/storage/local/dataCore.ts`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
dc.loadLocal();
g.__toasts.length = 0;
const big = (n: number) => ({
  ...dc.getData(),
  pages: [
    {
      id: "p",
      subject_id: "s",
      title: "besar",
      content: "x".repeat(n),
      pinned: false,
      position: 0,
      deleted: false,
      updated_at: new Date().toISOString(),
      dirty: false,
      editedOffline: false,
    },
  ],
});
dc.setData(big(1_000_000));
await sleep(400);
t("1 juta karakter: tanpa peringatan", g.__toasts.length === 0);
dc.setData(big(4_200_000));
await sleep(400);
t(
  "4,2 juta karakter: peringatan hampir penuh muncul",
  g.__toasts.length === 1 &&
    g.__toasts[0].kind === "warning" &&
    /hampir penuh \(8\d%\)/.test(g.__toasts[0].msg),
  g.__toasts,
);
dc.setData(big(4_300_000));
await sleep(400);
t("tidak mengulang peringatan dalam 30 menit", g.__toasts.length === 1);
process.exit(fail ? 1 : 0);
