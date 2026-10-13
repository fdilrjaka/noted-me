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

// ---------- 1. Keadaan awal ----------
await mount();
t(
  "awal: judul & saran tampil",
  text().includes("Tanya apa saja soal catatanmu") && text().includes("Rangkum catatan"),
);
t(
  "awal: kirim nonaktif saat kosong",
  ($('button[aria-label="Kirim"]') as HTMLButtonElement).disabled === true,
);

// ---------- 2. Kirim pesan -> menunggu -> jawaban Markdown ----------
let release!: (v: any) => void;
ai.handler = () => new Promise((res) => (release = res));
await typeInto("Apa itu entropi?");
t(
  "kirim aktif setelah mengetik",
  ($('button[aria-label="Kirim"]') as HTMLButtonElement).disabled === false,
);
await click('button[aria-label="Kirim"]');
t(
  "menunggu: indikator & tombol batal tampil",
  !!$('[role="status"]') && !!$('button[aria-label="Batalkan permintaan"]'),
);
t(
  "menunggu: pesan user tampil & composer kosong",
  text().includes("Apa itu entropi?") && ($("textarea") as HTMLTextAreaElement).value === "",
);
t(
  "request: format pesan benar",
  ai.calls.length === 1 &&
    ai.calls[0].messages.length === 1 &&
    ai.calls[0].messages[0].content === "Apa itu entropi?",
);
await act(async () => {
  release({
    ok: true,
    content: "**Entropi** mengukur ketidakteraturan.\n\n- satu\n- dua\n\n<script>alert(1)</script>",
  });
  await sleep(80);
});
t(
  "jawaban: Markdown dirender",
  !!document.querySelector(".ai-prose strong") &&
    document.querySelectorAll(".ai-prose li").length === 2,
);
t(
  "jawaban: script tidak ada di DOM",
  !document.querySelector(".ai-prose script") && text().includes("<script>alert(1)</script>"),
);
t("jawaban: indikator hilang", !$('[role="status"]'));
t(
  "judul otomatis dipanggil sekali & dipakai",
  ai.titleCalls.length === 1 && text().includes("Judul Otomatis"),
);
const saved = await history.listChats("user-1");
t(
  "riwayat: tersimpan per user",
  saved.length === 1 && saved[0].messages.length === 2 && saved[0].title === "Judul Otomatis",
);
t("riwayat: user lain tidak melihat", (await history.listChats("user-2")).length === 0);

// ---------- 3. Salin ----------
const copyBtn = [...document.querySelectorAll("button")].find(
  (b) => b.textContent?.trim() === "Salin",
) as HTMLElement;
await act(async () => {
  copyBtn.click();
  await sleep(30);
});
t("salin: teks mentah masuk clipboard", copied[0]?.startsWith("**Entropi**"));
t(
  "salin: toast sukses",
  toasts().some((x) => x.kind === "success" && /disalin/i.test(x.msg)),
);

// ---------- 4. Galat -> Kirim ulang ----------
ai.handler = async () => ({
  ok: false,
  reason: "not_configured",
  message: "AI belum diaktifkan di server.",
});
await typeInto("pertanyaan kedua");
await click('button[aria-label="Kirim"]', 80);
t(
  "galat: tampil sebagai alert + tombol Kirim ulang",
  !!$('[role="alert"]') && text().includes("AI belum diaktifkan") && text().includes("Kirim ulang"),
);
ai.handler = async () => ({ ok: true, content: "sekarang berhasil" });
const before = ai.calls.length;
const retryBtn = [...document.querySelectorAll("button")].find((b) =>
  b.textContent?.trim().startsWith("Kirim ulang"),
) as HTMLElement;
await act(async () => {
  retryBtn.click();
  await sleep(80);
});
t(
  "kirim ulang: memanggil lagi & galat hilang",
  ai.calls.length === before + 1 && !$('[role="alert"]') && text().includes("sekarang berhasil"),
);
const lastCall = ai.calls[ai.calls.length - 1];
t(
  "kirim ulang: galat tidak ikut dikirim ke model",
  lastCall.messages.every((m: any) => !m.content.includes("AI belum diaktifkan")),
);
t(
  "kirim ulang: urutan peran selang-seling",
  lastCall.messages.map((m: any) => m.role).join() === "user,assistant,user",
);

// ---------- 5. Batal: hasil yang telat diabaikan ----------
ai.handler = () => new Promise((res) => (release = res));
await typeInto("pertanyaan ketiga");
await click('button[aria-label="Kirim"]');
await click('button[aria-label="Batalkan permintaan"]');
t(
  "batal: pesan dibatalkan tampil & tombol kirim kembali",
  text().includes("Permintaan dibatalkan.") && !!$('button[aria-label="Kirim"]'),
);
await act(async () => {
  release({ ok: true, content: "JAWABAN TELAT" });
  await sleep(60);
});
t("batal: jawaban telat tidak muncul", !text().includes("JAWABAN TELAT"));

// ---------- 6. Lampiran file teks ----------
ai.handler = async () => ({ ok: true, content: "sudah kubaca" });
await attach(new dom.window.File(["isi catatan penting"], "catatan.txt", { type: "text/plain" }));
t(
  "lampiran: chip tampil",
  !!document.querySelector('ul[aria-label="Lampiran"]') && text().includes("catatan.txt"),
);
await typeInto("rangkum");
await click('button[aria-label="Kirim"]', 100);
const withFile = ai.calls[ai.calls.length - 1].messages.at(-1).content as string;
t(
  "lampiran: dikirim sebagai blok <lampiran> + pertanyaan",
  withFile.includes('<lampiran nama="catatan.txt">') &&
    withFile.includes("isi catatan penting") &&
    withFile.endsWith("rangkum"),
);
t("lampiran: chip hilang setelah kirim", !document.querySelector('ul[aria-label="Lampiran"]'));

// ---------- 7. Lampiran tidak didukung & kosong ----------
await attach(new dom.window.File(["x"], "nilai.xlsx"));
t(
  "xlsx: ditolak dengan pesan jelas",
  toasts().some((x) => x.kind === "error" && /\.xlsx belum didukung/.test(x.msg)),
);
await attach(new dom.window.File(["   \n  "], "kosong.txt", { type: "text/plain" }));
t(
  "file kosong: ditolak",
  toasts().some((x) => x.kind === "error" && /Tidak ada teks/.test(x.msg)),
);
t("ditolak: tidak ada chip", !document.querySelector('ul[aria-label="Lampiran"]'));

// ---------- 8. Batas lampiran ----------
for (let i = 0; i < 6; i++)
  await attach(new dom.window.File([`isi ${i}`], `f${i}.txt`, { type: "text/plain" }));
t(
  "batas: maksimal 5 lampiran",
  document.querySelectorAll('ul[aria-label="Lampiran"] li').length === 5 &&
    toasts().some((x) => /Maksimal 5 lampiran/.test(x.msg)),
);

// ---------- 9. Percakapan baru & riwayat ----------
await click('button[aria-label="Percakapan baru"]');
t("percakapan baru: kembali ke keadaan awal", text().includes("Tanya apa saja soal catatanmu"));
t("percakapan lama tetap tersimpan", (await history.listChats("user-1")).length === 1);
await unmount();

// ---------- 9b. Simpan jawaban ke catatan & lampirkan catatan ----------
const { createSubject } = await import(`${SRC}/storage/local/subjectStore.ts`);
const { createPage, patchPage } = await import(`${SRC}/storage/local/pageStore.ts`);
const { getData } = await import(`${SRC}/storage/local/dataCore.ts`);
const { SaveToNoteMenu } = await import(`${SRC}/features/ai/components/SaveToNoteMenu.tsx`);
const { NotePicker } = await import(`${SRC}/features/ai/components/NotePicker.tsx`);

const subjectId = createSubject("Fisika Dasar");
const existingPage = createPage(subjectId, "Pertemuan 1");
patchPage(existingPage, { content: "<p>Hukum <b>Newton</b> pertama</p><p>Inersia</p>" });
const emptyPage = createPage(subjectId, "Pertemuan kosong");

document.body.innerHTML = "<div id=root></div>";
root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(
    React.createElement(SaveToNoteMenu, {
      markdown: "## Ringkasan Bab\n\n- poin **penting**",
      fallbackTitle: "cadangan",
    }),
  );
  await sleep(30);
});
const trigger = [...document.querySelectorAll("button")].find((b) =>
  b.textContent?.includes("Simpan ke catatan"),
) as HTMLElement;
await act(async () => {
  trigger.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await sleep(60);
});
const item = [...document.querySelectorAll('[role="menuitem"]')].find((e) =>
  e.textContent?.includes("Fisika Dasar"),
) as HTMLElement;
t("simpan: menu menampilkan mata kuliah", !!item);
const pagesBefore = getData().pages.length;
await act(async () => {
  item.click();
  await sleep(60);
});
const created = getData().pages.find((p: any) => p.title === "Ringkasan Bab");
t(
  "simpan: halaman baru dibuat dengan judul dari jawaban",
  getData().pages.length === pagesBefore + 1 && !!created,
);
t(
  "simpan: isi jadi HTML aman",
  !!created &&
    created.content.includes("<h2>Ringkasan Bab</h2>") &&
    created.content.includes("<strong>penting</strong>") &&
    created.subject_id === subjectId,
);
t(
  "simpan: toast sukses menyebut mata kuliah",
  toasts().some((x) => x.kind === "success" && x.msg === "Disimpan ke Fisika Dasar"),
);
await act(async () => root.unmount());

const picked: any[] = [];
document.body.innerHTML = "<div id=root></div>";
root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(
    React.createElement(NotePicker, {
      open: true,
      onOpenChange: () => {},
      onPick: (a: any) => picked.push(a),
    }),
  );
  await sleep(60);
});
const rows = [...document.querySelectorAll('[role="dialog"] button')].filter((b) =>
  b.textContent?.includes("Pertemuan"),
);
const emptyRow = rows.find((b) => b.textContent?.includes("Pertemuan kosong")) as HTMLButtonElement;
t(
  "pemilih catatan: halaman bawaan kosong juga nonaktif",
  rows.filter((b) => (b as HTMLButtonElement).disabled).length === 2,
);
const fullRow = rows.find(
  (b) => b.textContent?.includes("Pertemuan 1") && !(b as HTMLButtonElement).disabled,
) as HTMLButtonElement;
t("pemilih catatan: halaman kosong dinonaktifkan", !!emptyRow && emptyRow.disabled === true);
await act(async () => {
  fullRow.click();
  await sleep(40);
});
t(
  "pemilih catatan: teks halaman jadi lampiran (tanpa tag HTML)",
  picked.length === 1 &&
    picked[0].kind === "note" &&
    picked[0].name === "Fisika Dasar / Pertemuan 1" &&
    picked[0].text === "Hukum Newton pertama Inersia",
  JSON.stringify(picked),
);
await act(async () => root.unmount());

// ---------- 10. Gambar tidak ikut tersimpan ----------
const stripped = history.stripForStorage({
  id: "c",
  userId: "u",
  title: "t",
  createdAt: "",
  updatedAt: "",
  messages: [
    {
      id: "m",
      role: "user",
      text: "",
      createdAt: "",
      attachments: [
        { id: "i", kind: "image", name: "a.jpg", dataUrl: "data:image/jpeg;base64,AAAA" },
      ],
    },
  ],
});
t(
  "penyimpanan: dataUrl gambar dibuang, nama tetap",
  !("dataUrl" in stripped.messages[0].attachments[0]) &&
    stripped.messages[0].attachments[0].name === "a.jpg",
);

if (fail) {
  console.log(`\n${fail} tes UI AI gagal`);
  process.exit(1);
}
console.log("\nsemua tes UI AI lulus");
process.exit(0);
