const SRC = new URL("../src", import.meta.url).pathname;
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "https://noteme.test/",
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.localStorage = dom.window.localStorage;
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
for (const k of [
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "KeyboardEvent",
  "DOMParser",
  "NodeFilter",
  "MouseEvent",
  "File",
  "Blob",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "MutationObserver",
  "getComputedStyle",
  "CustomEvent",
  "FocusEvent",
  "PointerEvent",
])
  if ((dom.window as any)[k] && !g[k]) g[k] = (dom.window as any)[k];
// Node punya CustomEvent/Event native yang tidak dikenali jsdom: pakai versi jsdom.
for (const k of ["Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "FocusEvent"])
  g[k] = (dom.window as any)[k];
// Polyfill lingkungan: jsdom tidak punya ini, browser sungguhan punya.
dom.window.matchMedia = (() => ({ matches: false })) as any;
(dom.window.HTMLElement.prototype as any).scrollIntoView = () => {};
g.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.IS_REACT_ACT_ENVIRONMENT = true;
const copied: string[] = [];
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: { writeText: async (t: string) => void copied.push(t) },
  configurable: true,
});

const React = (await import("react")).default;
g.React = React;
const { createRoot } = await import("react-dom/client");
const { act } = React as any;
const { AiPage } = await import(`${SRC}/features/ai/index.tsx`);
const history = await import(`${SRC}/features/ai/lib/history.ts`);

let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toasts = () => g.__toasts as Array<{ kind: string; msg: string }>;
const ai = g.__ai;
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const text = () => document.body.textContent ?? "";

let root: any;
async function mount() {
  document.body.innerHTML = "<div id=root></div>";
  root = createRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(React.createElement(AiPage));
    await sleep(30);
  });
}
async function unmount() {
  await act(async () => root.unmount());
}
async function typeInto(value: string) {
  const el = $("textarea") as HTMLTextAreaElement;
  const set = Object.getOwnPropertyDescriptor(
    dom.window.HTMLTextAreaElement.prototype,
    "value",
  )!.set!;
  await act(async () => {
    set.call(el, value);
    el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
async function click(sel: string, wait = 60) {
  const el = $(sel);
  if (!el) throw new Error("elemen tidak ada: " + sel);
  await act(async () => {
    el.click();
    await sleep(wait);
  });
}
async function attach(file: File) {
  const input = $('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await sleep(60);
  });
}

// ---------- Panel kanan (artifact) ----------
const fence = (o: unknown) => "```noteme-file\n" + JSON.stringify(o) + "\n```";
const DOC_V1 = fence({
  format: "docx",
  filename: "Laporan",
  title: "Laporan",
  content: "# Laporan Uji\n\nIsi **versi satu**.\n\n| A | B |\n|---|---|\n| 1 | 2 |",
});
const DOC_V2 = fence({
  format: "docx",
  filename: "Laporan",
  title: "Laporan",
  content: "# Laporan Uji\n\nIsi versi dua.",
});
const XLS = fence({
  format: "xlsx",
  filename: "Nilai",
  sheets: [
    {
      name: "Kelas A",
      rows: [
        ["Nama", "Nilai"],
        ["Andi", 90],
      ],
    },
    {
      name: "Kelas B",
      rows: [
        ["Nama", "Nilai"],
        ["Budi", 80],
      ],
    },
  ],
});
const panel = () => $('aside[aria-label^="Pratinjau"]');

async function ask(q: string, reply: string) {
  ai.handler = async () => ({ ok: true, content: reply });
  await typeInto(q);
  await click('button[aria-label="Kirim"]', 120);
}
async function setValue(el: HTMLElement, value: string, proto: any, ev = "input") {
  const set = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  await act(async () => {
    set.call(el, value);
    el.dispatchEvent(new dom.window.Event(ev, { bubbles: true }));
    await sleep(20);
  });
}

await mount();
t("panel: tertutup di awal", !panel());

await ask("buat laporan", `Ini dokumennya.\n\n${DOC_V1}`);
t("panel: terbuka otomatis saat jawaban berisi file", !!panel());
t("panel: nama file di header", (panel()?.textContent ?? "").includes("Laporan.docx"));
t(
  "panel: pratinjau kertas merender Markdown",
  !!panel()?.querySelector(".ai-paper h1") &&
    !!panel()?.querySelector(".ai-paper table") &&
    !!panel()?.querySelector(".ai-paper strong"),
);
t("panel: blok mentah tidak tampil di chat", !text().includes("noteme-file"));
t("kartu: ditandai terbuka", !!$('button[aria-label="Buka Laporan.docx"][aria-pressed="true"]'));

// Edit
await act(async () => {
  (
    [...panel()!.querySelectorAll('[role="tab"]')].find(
      (b) => b.textContent === "Edit",
    ) as HTMLElement
  ).click();
  await sleep(30);
});
const ta = panel()!.querySelector("textarea") as HTMLTextAreaElement;
t("edit: textarea berisi Markdown", ta.value.startsWith("# Laporan Uji"));
await setValue(ta, "# Judul Baru\n\nIsi hasil edit.", dom.window.HTMLTextAreaElement.prototype);
t(
  "edit: badge Diedit & tombol Kembalikan muncul",
  (panel()?.textContent ?? "").includes("Diedit") &&
    (panel()?.textContent ?? "").includes("Kembalikan"),
);
await act(async () => {
  (
    [...panel()!.querySelectorAll('[role="tab"]')].find(
      (b) => b.textContent === "Pratinjau",
    ) as HTMLElement
  ).click();
  await sleep(30);
});
t(
  "edit: pratinjau mengikuti hasil edit",
  panel()?.querySelector(".ai-paper h1")?.textContent === "Judul Baru",
);
await act(async () => {
  (
    [...panel()!.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Kembalikan"),
    ) as HTMLElement
  ).click();
  await sleep(30);
});
t(
  "edit: Kembalikan memulihkan isi asli",
  panel()?.querySelector(".ai-paper h1")?.textContent === "Laporan Uji" &&
    !(panel()?.textContent ?? "").includes("Diedit"),
);

// Tutup / buka lewat kartu / Esc
await click('button[aria-label="Tutup panel"]');
t("panel: tombol tutup", !panel());
await click('button[aria-label="Buka Laporan.docx"]');
t("panel: kartu membuka kembali", !!panel());
await act(async () => {
  window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape" }));
  await sleep(20);
});
t("panel: Esc menutup", !panel());

// Versi: file bernama sama dari jawaban berikutnya
await ask("revisi laporan", `Sudah direvisi.\n\n${DOC_V2}`);
t(
  "versi: panel terbuka ke versi terbaru",
  !!panel() && (panel()?.textContent ?? "").includes("Isi versi dua."),
);
const sel = panel()?.querySelector('select[aria-label="Versi file"]') as HTMLSelectElement | null;
t(
  "versi: pemilih versi muncul dengan 2 pilihan",
  !!sel && sel.options.length === 2 && sel.options[1]!.text.includes("terbaru"),
);
await setValue(sel!, sel!.options[0]!.value, dom.window.HTMLSelectElement.prototype, "change");
t("versi: pilih versi 1 menampilkan isi lama", (panel()?.textContent ?? "").includes("versi satu"));

// Excel
await ask("buat nilai", `Tabel nilai.\n\n${XLS}`);
t(
  "xlsx: panel terbuka dengan grid",
  !!panel()?.querySelector("table") && (panel()?.textContent ?? "").includes("Andi"),
);
t(
  "xlsx: huruf kolom & nomor baris",
  (panel()?.textContent ?? "").includes("A") && !!panel()?.querySelector("thead th:nth-child(3)"),
);
t(
  "xlsx: tab lembar",
  [...panel()!.querySelectorAll('[aria-label="Lembar"] [role="tab"]')].length === 2,
);
await act(async () => {
  ([...panel()!.querySelectorAll('[aria-label="Lembar"] [role="tab"]')][1] as HTMLElement).click();
  await sleep(30);
});
t(
  "xlsx: pindah lembar",
  (panel()?.textContent ?? "").includes("Budi") && !(panel()?.textContent ?? "").includes("Andi"),
);
await act(async () => {
  (
    [...panel()!.querySelectorAll('[role="tab"]')].find(
      (b) => b.textContent === "Edit",
    ) as HTMLElement
  ).click();
  await sleep(30);
});
const cell = panel()!.querySelector('input[aria-label="B2"]') as HTMLInputElement;
t("xlsx edit: sel B2 berisi 80", cell?.value === "80");
await setValue(cell, "95,5", dom.window.HTMLInputElement.prototype);
await act(async () => {
  cell.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true }));
  cell.blur();
  await sleep(30);
});
t(
  "xlsx edit: nilai tersimpan sebagai angka",
  (panel()!.querySelector('input[aria-label="B2"]') as HTMLInputElement).value === "95.5",
);

// Unduh (stub URL.createObjectURL: jsdom tidak punya)
const made: Array<{ size: number }> = [];
const downloads: string[] = [];
(dom.window.URL as any).createObjectURL = (b: Blob) => (made.push({ size: b.size }), "blob:fake");
(dom.window.URL as any).revokeObjectURL = () => {};
g.URL.createObjectURL = (dom.window.URL as any).createObjectURL;
g.URL.revokeObjectURL = () => {};
const origClick = dom.window.HTMLAnchorElement.prototype.click;
dom.window.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  downloads.push(this.download);
};
await act(async () => {
  (
    [...panel()!.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Unduh",
    ) as HTMLElement
  ).click();
  await sleep(1200);
});
dom.window.HTMLAnchorElement.prototype.click = origClick;
t(
  "unduh xlsx: file dibuat dengan nama benar & tidak kosong",
  downloads.includes("Nilai.xlsx") && made.length === 1 && made[0]!.size > 1000,
  JSON.stringify({ downloads, made }),
);

// Pindah percakapan menutup panel
await click('button[aria-label="Percakapan baru"]');
t("panel: tertutup saat percakapan baru", !panel());

await unmount();
if (fail) {
  console.log(`\n${fail} tes panel gagal`);
  process.exit(1);
}
console.log("\nsemua tes panel lulus");
process.exit(0);
