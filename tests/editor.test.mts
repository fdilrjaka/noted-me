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
for (const k of [
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "MutationObserver",
  "DOMParser",
  "NodeFilter",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "ResizeObserver",
])
  if ((dom.window as any)[k] && !g[k]) g[k] = (dom.window as any)[k];
g.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.IS_REACT_ACT_ENVIRONMENT = true;
(dom.window as any).matchMedia = (q: string) => ({
  matches: false,
  media: q,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const React = (await import("react")).default;
g.React = React;
const { createRoot } = await import("react-dom/client");
const { act } = React as any;
await import("./fakes/supabase.ts");
const { Editor } = await import(`${ROOT}/src/components/noteme/editor/Editor.tsx`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const el = () => document.querySelector("[contenteditable]") as HTMLElement;
const type = (html: string) => {
  el().innerHTML = html;
  el().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
};
const out: any = {};

async function scenario(name: string, action: (root: any, calls: any[]) => Promise<void>) {
  document.body.innerHTML = "<div id=root></div>";
  const root = createRoot(document.getElementById("root")!);
  const calls: any[] = [];
  const mk = (id: string, content: string) =>
    React.createElement(Editor, {
      pageId: id,
      initialContent: content,
      onChange: (h: string) => calls.push([id, h]),
    });
  (root as any).mk = mk;
  await act(async () => {
    root.render(mk("A", "<p>isi A</p>"));
  });
  await action(root, calls);
  await act(async () => {
    await sleep(900);
  });
  out[name] = calls.map(([id, h]) => `${id}=${h}`);
  await act(async () => {
    root.unmount();
  });
}

// 1) Ketik di halaman A, pindah ke B sebelum 600ms.
await scenario("ketikA_lalu_pindahB", async (root) => {
  await act(async () => {
    type("<p>isi A + ketikan baru</p>");
  });
  await act(async () => {
    root.render((root as any).mk("B", "<p>isi B</p>"));
  });
});
// 2) Ketik lalu editor dibongkar (tutup halaman) sebelum 600ms.
await scenario("ketik_lalu_unmount", async (root) => {
  await act(async () => {
    type("<p>ketikan terakhir</p>");
  });
  await act(async () => {
    root.render(React.createElement("div"));
  });
});
// 3) HTML berbahaya dari sumber tak tepercaya tidak boleh masuk DOM.
document.body.innerHTML = "<div id=root></div>";
{
  const root = createRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(
      React.createElement(Editor, {
        pageId: "X",
        initialContent: `<p>ok</p><img src=x onerror="window.__xss=1"><script>window.__xss=2</script><a href="javascript:alert(1)">l</a>`,
        onChange() {},
      }),
    );
  });
  const html = el().innerHTML;
  out["xss_dibuang"] = !/onerror|<script|javascript:/i.test(html) && html.includes("<p>ok</p>");
  await act(async () => {
    root.unmount();
  });
}
t(
  "ketik di halaman A lalu pindah ke B: A menyimpan ketikannya sendiri (bukan isi B)",
  JSON.stringify(out.ketikA_lalu_pindahB) === JSON.stringify(["A=<p>isi A + ketikan baru</p>"]),
  out.ketikA_lalu_pindahB,
);
t(
  "ketik lalu unmount dalam 600ms: ketikan terakhir tersimpan",
  JSON.stringify(out.ketik_lalu_unmount) === JSON.stringify(["A=<p>ketikan terakhir</p>"]),
  out.ketik_lalu_unmount,
);
t(
  "HTML berbahaya dari sumber tak tepercaya tidak masuk DOM",
  out.xss_dibuang === true,
  out.xss_dibuang,
);
process.exit(fail ? 1 : 0);
