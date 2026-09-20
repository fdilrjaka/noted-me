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
])
  if ((dom.window as any)[k] && !g[k]) g[k] = (dom.window as any)[k];
g.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import("react")).default;
g.React = React;
const { createRoot } = await import("react-dom/client");
const { act } = React as any;
const fake: any = await import("./fakes/supabase.ts");
const A = g.__fake.auth;
A.mode = true;
const { useAuthForm } = await import(`${SRC}/features/auth/hooks/useAuthForm.ts`);
const { AuthForm } = await import(`${SRC}/features/auth/components/AuthForm.tsx`);
const { useAccountSettings } = await import(`${SRC}/features/settings/hooks/useAccountSettings.ts`);
const { PasswordHint } = await import(`${SRC}/features/auth/components/PasswordHint.tsx`);

let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toasts = () => g.__toasts as Array<{ kind: string; msg: string }>;
const lastToast = () => toasts()[toasts().length - 1];
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const byPlaceholder = (p: string) =>
  document.querySelector(`input[placeholder^="${p}"]`) as HTMLInputElement;
const type = async (p: string, v: string) => {
  const el = byPlaceholder(p);
  const set = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    set.call(el, v);
    el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
};
const clickText = async (txt: string, wait = 400) => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    x.textContent?.trim().startsWith(txt),
  ) as HTMLElement;
  if (!b) throw new Error("tombol tidak ada: " + txt);
  await act(async () => {
    b.click();
    await sleep(wait);
  });
};

function Harness() {
  const form = useAuthForm();
  return React.createElement(AuthForm, { form });
}
let root: any;
async function mount() {
  document.body.innerHTML = "<div id=root></div>";
  root = createRoot(document.getElementById("root")!);
  g.__toasts.length = 0;
  g.__navs.length = 0;
  await act(async () => {
    root.render(React.createElement(Harness));
  });
}
async function unmount() {
  await act(async () => {
    root.unmount();
  });
}

// 1) DAFTAR tanpa karakter spesial -> notifikasi, tidak memanggil signUp
await mount();
await clickText("Belum punya akun", 50);
t("berpindah ke mode daftar", !!$("h2") && $("h2")!.textContent === "Buat akun");
await type("Username", "budi_01");
await type("Password", "abcdef1");
t(
  "hint: syarat spesial tampil merah setelah mengetik",
  !!document.querySelector("li.text-destructive"),
);
await clickText("Daftar", 200);
t(
  "daftar tanpa spesial -> toast error menyebut karakter spesial",
  lastToast()?.kind === "error" && /karakter spesial/.test(lastToast().msg),
  lastToast(),
);
t("... dan signUp TIDAK dipanggil", A.signUps.length === 0);
await type("Password", "abc");
await clickText("Daftar", 200);
t(
  "password pendek + tanpa spesial -> pesan gabungan",
  /minimal 6 karakter dan/.test(lastToast().msg),
  lastToast(),
);
await type("Password", "abcdef!");
t(
  "hint: semua syarat hijau",
  document.querySelectorAll("li.text-primary").length === 2 &&
    !document.querySelector("li.text-destructive"),
);

// 2) DAFTAR dengan username tidak sah
await type("Username", "budi santoso");
await type("Password", "abcdef!");
await clickText("Daftar", 200);
t(
  "username berspasi ditolak",
  lastToast()?.kind === "error" &&
    /Username hanya boleh/.test(lastToast().msg) &&
    A.signUps.length === 0,
  lastToast(),
);

// 3) DAFTAR valid -> dialog kode pemulihan, navigasi ditahan
await type("Username", "budi_01");
await type("Password", "Rahasia!1");
await clickText("Daftar", 1500);
t("signUp dipanggil sekali", A.signUps.length === 1 && A.signUps[0].email === "budi_01@noteme.app");
const dialog = $('[role="dialog"]');
t("dialog kode pemulihan tampil", !!dialog);
const shown = [...document.querySelectorAll('[role="dialog"] li')].map((l) => l.textContent!);
t(
  "10 kode berformat XXXX-XXXX-XXXX-XXXX",
  shown.length === 10 && shown.every((c) => /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(c)),
  shown.slice(0, 2),
);
t("navigasi ditahan selama dialog terbuka", g.__navs.length === 0);
const done = [...document.querySelectorAll("button")].find(
  (b) => b.textContent === "Selesai",
) as HTMLButtonElement;
t("tombol Selesai nonaktif sebelum dicentang", done.disabled === true);
await act(async () => {
  (document.querySelector('[role="dialog"] input[type=checkbox]') as HTMLInputElement).click();
});
t(
  "aktif setelah dicentang",
  (
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Selesai",
    ) as HTMLButtonElement
  ).disabled === false,
);
await clickText("Selesai", 50);
t(
  "setelah Selesai: dialog tertutup & navigasi ke /",
  !$('[role="dialog"]') && g.__navs.length === 1 && g.__navs[0].to === "/",
);
const savedCodes = shown;
await unmount();

// 4) LOGIN akun lama dengan password TANPA karakter spesial tetap berhasil
A.users.set("lama@noteme.app", { id: "user-legacy", password: "abcdef" });
await mount();
await type("Username", "lama");
await type("Password", "abcdef");
await clickText("Masuk", 800);
t(
  "login akun lama (password tanpa spesial) tidak diblokir kebijakan",
  toasts().some((x) => x.kind === "success"),
  toasts(),
);
t("... dan tidak ada dialog kode (itu hanya saat daftar)", !$('[role="dialog"]'));
await unmount();

// 5) LUPA PASSWORD
await mount();
await clickText("Lupa password?", 50);
t(
  "mode lupa password tampil (field kode + ulangi)",
  !!byPlaceholder("Kode pemulihan") &&
    !!byPlaceholder("Ulangi password baru") &&
    $("h2")!.textContent === "Lupa password",
);
await type("Username", "budi_01");
await type("Kode pemulihan", "AAAA-AAAA-AAAA-AAAA");
await type("Password baru", "Baru!456");
await type("Ulangi", "Baru!456");
await clickText("Atur ulang password", 600);
t(
  "kode salah -> pesan generik",
  lastToast()?.kind === "error" && /salah, atau kode sudah pernah dipakai/.test(lastToast().msg),
  lastToast(),
);
await type("Kode pemulihan", savedCodes[0].toLowerCase().replace(/-/g, " "));
await type("Password baru", "tanpaspesial9");
await type("Ulangi", "tanpaspesial9");
await clickText("Atur ulang password", 300);
t(
  "password baru tanpa spesial -> notifikasi",
  /karakter spesial/.test(lastToast().msg),
  lastToast(),
);
await type("Password baru", "Baru!456");
await type("Ulangi", "Baru!457");
await clickText("Atur ulang password", 300);
t(
  "konfirmasi tidak sama -> notifikasi",
  /Konfirmasi password tidak sama/.test(lastToast().msg),
  lastToast(),
);
await type("Ulangi", "Baru!456");
await clickText("Atur ulang password", 900);
t(
  "reset berhasil -> toast sukses & kembali ke mode Masuk",
  lastToast()?.kind === "success" && $("h2")!.textContent === "Masuk",
  lastToast(),
);
t("password di 'server' berubah", A.users.get("budi_01@noteme.app").password === "Baru!456");
await type("Username", "budi_01");
await type("Password", "Rahasia!1");
await clickText("Masuk", 600);
t(
  "password lama tidak bisa dipakai lagi",
  lastToast()?.kind === "error" && /salah/.test(lastToast().msg),
  lastToast(),
);
await type("Password", "Baru!456");
await clickText("Masuk", 800);
t("password baru bisa login", lastToast()?.kind === "success", lastToast());
await clickText("Lupa password?", 10).catch(() => {});
await unmount();
await mount();
await clickText("Lupa password?", 50);
await type("Username", "budi_01");
await type("Kode pemulihan", savedCodes[0]);
await type("Password baru", "Lagi!789");
await type("Ulangi", "Lagi!789");
await clickText("Atur ulang password", 700);
t("kode yang sama tidak bisa dipakai dua kali", lastToast()?.kind === "error", lastToast());
await unmount();

// 6) GANTI PASSWORD di Settings
function AcctHarness() {
  g.__acct = useAccountSettings();
  return null;
}
A.current = { id: "user-1", email: "budi_01@noteme.app" };
document.body.innerHTML = "<div id=root></div>";
root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(React.createElement(AcctHarness));
  await sleep(100);
});
g.__toasts.length = 0;
A.updates.length = 0;
await act(async () => {
  g.__acct.setNewPassword("abcdefg");
});
await act(async () => {
  await g.__acct.changePassword();
});
t(
  "ganti password tanpa spesial -> notifikasi & TIDAK dikirim",
  /karakter spesial/.test(lastToast()?.msg ?? "") && A.updates.length === 0,
  [lastToast(), A.updates],
);
await act(async () => {
  g.__acct.setNewPassword("abc!efg");
});
await act(async () => {
  await g.__acct.changePassword();
});
t(
  "ganti password sah -> updateUser dipanggil",
  A.updates.length === 1 && A.updates[0] === "abc!efg",
  A.updates,
);
t(
  "kartu pemulihan: sisa kode terbaca dari server",
  g.__acct.recoveryRemaining === 9,
  g.__acct.recoveryRemaining,
);
await act(async () => {
  g.__acct.setRecoveryPassword("salah");
});
await act(async () => {
  await g.__acct.generateCodes();
});
t(
  "buat kode baru dgn password salah ditolak",
  lastToast()?.kind === "error" && g.__acct.generatedCodes === null,
  lastToast(),
);
await act(async () => {
  g.__acct.setRecoveryPassword("Baru!456");
});
await act(async () => {
  await g.__acct.generateCodes();
});
t(
  "buat kode baru dgn password benar -> 10 kode",
  g.__acct.generatedCodes?.length === 10 && g.__acct.recoveryRemaining === 10,
  g.__acct.generatedCodes?.length,
);
await act(async () => {
  root.unmount();
});

console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
