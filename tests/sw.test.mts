import { readFileSync } from "node:fs";
// Simulasi minimal CacheStorage + lingkungan Service Worker
const stores = new Map<string, Map<string, Response>>();
const keyOf = (r: Request | string) =>
  typeof r === "string" ? new URL(r, "https://n.test").href : r.url;
const mkCache = (name: string) => {
  const m = stores.get(name) ?? new Map();
  stores.set(name, m);
  return {
    async put(r: any, res: Response) {
      m.delete(keyOf(r));
      m.set(keyOf(r), res);
    },
    async match(r: any) {
      const v = m.get(keyOf(r));
      return v ? v.clone() : undefined;
    },
    async keys() {
      return [...m.keys()].map((u) => new Request(u));
    },
    async delete(r: any) {
      return m.delete(keyOf(r));
    },
    async addAll(urls: string[]) {
      for (const u of urls) m.set(keyOf(u), await fetch(u));
    },
  };
};
const caches: any = {
  open: async (n: string) => mkCache(n),
  keys: async () => [...stores.keys()],
  delete: async (n: string) => stores.delete(n),
  async match(r: any) {
    for (const m of stores.values()) {
      const v = m.get(keyOf(r));
      if (v) return v.clone();
    }
    return undefined;
  },
};
let online = true;
const net: Record<string, () => Response> = {};
const hits: string[] = [];
const fakeFetch = async (r: any) => {
  const u = keyOf(r);
  hits.push(u);
  if (!online) throw new TypeError("offline");
  const f = net[new URL(u).pathname];
  const res = f ? f() : new Response("nf", { status: 404 });
  Object.defineProperty(res, "type", { value: "basic" });
  return res;
};
const listeners: Record<string, Function> = {};
const g: any = globalThis;
g.caches = caches;
g.fetch = fakeFetch;
g.self = {
  location: { origin: "https://n.test" },
  addEventListener: (t: string, f: Function) => (listeners[t] = f),
  skipWaiting() {},
  clients: { claim: async () => {} },
};
const html =
  (body: string, extra: ResponseInit = {}) =>
  () =>
    new Response(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      ...extra,
    });
net["/"] = html("SHELL");
net["/todo"] = html("TODO-PAGE");
net["/assets/app-abc.js"] = () =>
  new Response("js1", { headers: { "content-type": "text/javascript" } });
net["/icon.png"] = () => new Response("icon-v1");
net["/_serverFn/xyz"] = () => new Response("remaining=9");
eval(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"));

const pending: Promise<any>[] = [];
async function req(path: string, opts: { navigate?: boolean; method?: string } = {}) {
  const request = Object.defineProperty(
    new Request("https://n.test" + path, { method: opts.method ?? "GET" }),
    "mode",
    { value: opts.navigate ? "navigate" : "cors" },
  );
  let responded: Promise<Response> | null = null;
  listeners["fetch"]({
    request,
    respondWith: (p: any) => (responded = Promise.resolve(p)),
    waitUntil: (p: Promise<any>) => pending.push(p),
  });
  const res = responded ? await responded : "PASSTHROUGH";
  await Promise.all(pending.splice(0));
  return res as Response | "PASSTHROUGH";
}
const text = async (r: any) => (r === "PASSTHROUGH" ? "PASSTHROUGH" : r.text());
let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};

let ev: any = { waitUntil: (p: any) => pending.push(p) };
listeners["install"](ev);
await Promise.all(pending.splice(0));
t("install menyimpan app shell '/'", (await caches.match("/")) !== undefined);
await text(await req("/todo", { navigate: true }));
t(
  "navigasi /todo disimpan di URL-nya sendiri",
  (await (await caches.match("/todo"))!.text()) === "TODO-PAGE",
);
t(
  "cache '/' TIDAK ditimpa oleh navigasi lain (bug lama)",
  (await (await caches.match("/"))!.text()) === "SHELL",
);
online = false;
t(
  "offline: /todo disajikan dari cache miliknya",
  (await text(await req("/todo", { navigate: true }))) === "TODO-PAGE",
);
t(
  "offline: halaman yang belum pernah dibuka jatuh ke shell '/'",
  (await text(await req("/belum-pernah", { navigate: true }))) === "SHELL",
);
online = true;
net["/rusak"] = () =>
  new Response("Internal Server Error", { status: 500, headers: { "content-type": "text/html" } });
await req("/rusak", { navigate: true });
t("respons error (500) tidak disimpan", (await caches.match("/rusak")) === undefined);
net["/lama"] = () => {
  const r = new Response("REDIR", { status: 200, headers: { "content-type": "text/html" } });
  Object.defineProperty(r, "redirected", { value: true });
  return r;
};
await req("/lama", { navigate: true });
t("respons hasil redirect tidak disimpan", (await caches.match("/lama")) === undefined);
net["/data.json"] = () => new Response("{}", { headers: { "content-type": "application/json" } });
await req("/todo", { navigate: true });
net["/todo"] = () => new Response("{}", { headers: { "content-type": "application/json" } });
await req("/todo", { navigate: true });
t(
  "respons non-HTML pada navigasi tidak menimpa cache halaman",
  (await (await caches.match("/todo"))!.text()) === "TODO-PAGE",
);

t(
  "server function tidak dicegat (langsung ke jaringan)",
  (await req("/_serverFn/xyz")) === "PASSTHROUGH",
);
t("... dan tidak pernah masuk cache", (await caches.match("/_serverFn/xyz")) === undefined);
t("/api tidak dicegat", (await req("/api/x")) === "PASSTHROUGH");
t("POST tidak dicegat", (await req("/todo", { method: "POST" })) === "PASSTHROUGH");

await req("/assets/app-abc.js");
online = false;
t(
  "aset ber-hash: offline dilayani dari cache",
  (await text(await req("/assets/app-abc.js"))) === "js1",
);
online = true;

await req("/icon.png");
net["/icon.png"] = () => new Response("icon-v2");
t("ikon: SWR menyajikan versi cache dulu", (await text(await req("/icon.png"))) === "icon-v1");
t(
  "ikon: ... dan menyegarkan di belakang layar",
  (await text(await req("/icon.png"))) === "icon-v2",
);

// pembatasan jumlah entri
for (let i = 0; i < 200; i++) {
  net[`/assets/f${i}.js`] = () => new Response("x");
  await req(`/assets/f${i}.js`);
}
const size = stores.get("noteme-shell-v2")!.size;
t(`jumlah entri dibatasi (${size} <= 150)`, size <= 150, size);
t("app shell '/' tetap ada setelah trimming", (await caches.match("/")) !== undefined);

// activate membuang cache versi lama
stores.set("noteme-shell-v1", new Map([["https://n.test/", new Response("old")]]));
ev = { waitUntil: (p: any) => pending.push(p) };
listeners["activate"](ev);
await Promise.all(pending.splice(0));
t(
  "activate membuang cache versi lama",
  !stores.has("noteme-shell-v1") && stores.has("noteme-shell-v2"),
);
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
