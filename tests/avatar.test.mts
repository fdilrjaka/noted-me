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
g.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import("react")).default;
g.React = React;
const { createRoot } = await import("react-dom/client");
const { act } = React as any;
await import("./fakes/supabase.ts");
const { useAvatarUpload, uploadAvatarBlob } = await import(
  `${SRC}/features/auth/hooks/useAvatarUpload.ts`
);
let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ST = g.__fake.storage,
  AU = g.__fake.auth;

const LEGACY =
  "data:image/jpeg;base64," + Buffer.from("fake-jpeg-bytes-".repeat(300)).toString("base64"); // ~6KB seperti avatar asli
const user = (avatar: string | null) =>
  ({
    id: "user-9",
    email: "x@noteme.app",
    user_metadata: { nickname: "Budi", avatar_url: avatar },
  }) as any;
function H({ u }: { u: any }) {
  g.__h = useAvatarUpload(u);
  return null;
}
const mount = async (u: any) => {
  document.body.innerHTML = "<div id=root></div>";
  const root = createRoot(document.getElementById("root")!);
  await act(async () => {
    root.render(React.createElement(H, { u }));
    await sleep(150);
  });
  return root;
};

// uploadAvatarBlob
const url = await uploadAvatarBlob("user-9", new Blob(["x"], { type: "image/jpeg" }));
t(
  "uploadAvatarBlob: path <uid>/avatar.jpg di bucket avatars, upsert",
  ST.uploads[0].bucket === "avatars" &&
    ST.uploads[0].path === "user-9/avatar.jpg" &&
    ST.uploads[0].opts.upsert === true &&
    ST.uploads[0].opts.contentType === "image/jpeg",
  ST.uploads[0],
);
t(
  "URL publik + cache-buster",
  /^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/avatars\/user-9\/avatar\.jpg\?v=\d+$/.test(
    url,
  ),
  url,
);

// migrasi otomatis avatar lama
ST.uploads.length = 0;
AU.metaUpdates.length = 0;
let root = await mount(user(LEGACY));
t(
  "avatar base64 lama diunggah ke Storage otomatis",
  ST.uploads.length === 1 && ST.uploads[0].size > 1000,
  ST.uploads,
);
t(
  "metadata diperbarui hanya dengan URL (bukan base64)",
  AU.metaUpdates.length === 1 &&
    /^https:\/\/.*avatar\.jpg\?v=/.test(AU.metaUpdates[0].avatar_url) &&
    !AU.metaUpdates[0].avatar_url.startsWith("data:"),
  AU.metaUpdates,
);
t(
  "state avatar di UI ikut menjadi URL",
  /^https:\/\//.test(g.__h.avatarUrl),
  g.__h.avatarUrl?.slice(0, 40),
);
const before = ST.uploads.length;
await act(async () => {
  root.render(React.createElement(H, { u: user(LEGACY) }));
  await sleep(100);
});
t("tidak migrasi berulang saat re-render", ST.uploads.length === before);
await act(async () => root.unmount());

// sudah URL -> tidak disentuh
ST.uploads.length = 0;
AU.metaUpdates.length = 0;
root = await mount(
  user("https://x.supabase.co/storage/v1/object/public/avatars/user-9/avatar.jpg?v=1"),
);
t(
  "avatar yang sudah berupa URL tidak dimigrasi",
  ST.uploads.length === 0 && AU.metaUpdates.length === 0,
);
await act(async () => root.unmount());
root = await mount(user(null));
t("tanpa avatar: tidak ada aksi", ST.uploads.length === 0 && AU.metaUpdates.length === 0);
await act(async () => root.unmount());

// bucket belum ada -> gagal diam-diam, avatar lama tetap
ST.failUpload = true;
ST.uploads.length = 0;
AU.metaUpdates.length = 0;
root = await mount(user(LEGACY));
t(
  "upload gagal (bucket belum ada): tidak crash, metadata tidak diubah, avatar lama tetap tampil",
  AU.metaUpdates.length === 0 && g.__h.avatarUrl === LEGACY,
);
await act(async () => root.unmount());
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
