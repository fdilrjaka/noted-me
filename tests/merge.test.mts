let fail = 0;
const t = (name: string, ok: boolean, detail: unknown = "") => {
  if (!ok) {
    fail++;
    console.log("FAIL", name, JSON.stringify(detail)?.slice(0, 300));
  } else console.log("ok  ", name);
};
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://noteme.test/" });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const { mergePageContent } = await import(`${ROOT}/src/storage/remote/conflictResolver.ts`);
const P = (content: string) => ({
  id: "p",
  subject_id: "s",
  title: "t",
  content,
  pinned: false,
  position: 0,
  deleted: false,
  updated_at: "",
  dirty: true,
  editedOffline: false,
});
const m = (l: string, r: string) => mergePageContent(P(l), P(r)) as string;
const out: Record<string, boolean> = {};

// 1. Edit lokal berisi gambar saja vs teks remote -> gambar harus selamat
let r = m(
  `<span class="img-resize-wrap"><img src="idb:IMG1" data-idb-id="IMG1"></span>`,
  `<p>Rapat besok jam 9</p>`,
);
out["gambar-saja tidak hilang"] = r.includes("idb:IMG1") && r.includes("Rapat besok");
// 2. Fragmen pendek "a" yang kebetulan ada di dalam kata remote -> edit lokal tidak boleh dibuang
r = m(`<p>a</p>`, `<p>Rapat pada hari senin</p>`);
out["fragmen pendek tidak dibuang"] = r.includes("<p>a</p>") && r.includes("Rapat pada");
// 3. Gaung hasil gabungan sebelumnya tidak boleh menumpuk lagi
const merged = m(`<p>Versi lokal</p>`, `<p>Versi remote</p>`);
const echo = m(merged, `<p>Versi remote</p>`);
out["gaung tidak menggandakan header"] =
  echo === merged && (echo.match(/Versi dari perangkat lain/g) ?? []).length === 1;
const echo2 = m(`<p>Versi remote</p>`, merged);
out["gaung arah sebaliknya"] = echo2 === merged;
// 4. Lokal superset remote -> lokal
out["lokal superset -> lokal"] =
  m(`<p>Halo dunia</p><p>tambahan</p>`, `<p>Halo dunia</p>`) === `<p>Halo dunia</p><p>tambahan</p>`;
// 5. Sama persis
out["sama persis"] = m(`<p>x</p>`, `<p>x</p>`) === `<p>x</p>`;
// 6. Dua edit berbeda -> keduanya ada
r = m(`<p>Kalimat lokal baru</p>`, `<p>Kalimat remote lain</p>`);
out["dua edit berbeda digabung"] =
  r.includes("Kalimat lokal baru") && r.includes("Kalimat remote lain");
// 7. Remote punya gambar yang tidak ada di lokal, teks sama -> jangan buang gambar remote
r = m(`<p>Catatan</p>`, `<p>Catatan</p><img src="idb:R1">`);
out["gambar remote tidak dibuang"] = r.includes("idb:R1");
for (const [name, ok] of Object.entries(out)) t(name, ok);
process.exit(fail ? 1 : 0);
