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
  if (!el) throw new Error("input tidak ada: " + p);
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

const EMAIL = "budi@noteme.app";

// 1) DAFTAR dengan email tidak valid -> notifikasi, signUp TIDAK dipanggil
await mount();
await clickText("Belum punya akun", 50);
t("berpindah ke mode daftar", !!$("h2") && $("h2")!.textContent === "Buat akun");
await type("E-mail", "bukan-email");
await type("Password", "abcdef");
await clickText("Daftar", 200);
t(
  "email tidak valid -> toast error alamat email",
  lastToast()?.kind === "error" && /alamat email yang valid/.test(lastToast().msg),
  lastToast(),
);
t("... dan signUp TIDAK dipanggil", A.signUps.length === 0);

// 2) DAFTAR dengan password terlalu pendek
await type("E-mail", EMAIL);
await type("Password", "abc");
t(
  "hint: syarat panjang tampil merah setelah mengetik pendek",
  !!document.querySelector("li.text-destructive"),
);
await clickText("Daftar", 200);
t(
  "password < 6 karakter -> toast kebijakan panjang",
  lastToast()?.kind === "error" && /minimal 6 karakter/.test(lastToast().msg),
  lastToast(),
);
t("... dan signUp masih TIDAK dipanggil", A.signUps.length === 0);
await type("Password", "abcdef");
t(
  "hint: syarat panjang jadi hijau setelah 6+ karakter",
  document.querySelectorAll("li.text-primary").length === 1 &&
    !document.querySelector("li.text-destructive"),
);

// 3) DAFTAR valid -> sesi langsung dibuat (fake tidak mengharuskan verifikasi email) & masuk ke "/"
await clickText("Daftar", 300);
t(
  "signUp dipanggil sekali dengan email yang benar",
  A.signUps.length === 1 && A.signUps[0].email === EMAIL,
  A.signUps,
);
t(
  "berhasil daftar -> toast selamat datang & navigasi ke /",
  lastToast()?.kind === "success" && g.__navs.length === 1 && g.__navs[0].to === "/",
  [lastToast(), g.__navs],
);
await unmount();

// 4) MASUK dengan password salah -> ditolak, dengan pesan yang ramah (bukan pesan mentah Supabase)
await mount();
await type("E-mail", EMAIL);
await type("Password", "salahbanget");
await clickText("Masuk", 400);
t(
  "password salah -> toast 'Email atau password salah'",
  lastToast()?.kind === "error" && /Email atau password salah/.test(lastToast().msg),
  lastToast(),
);

// 5) MASUK dengan password benar -> berhasil
await type("Password", "abcdef");
await clickText("Masuk", 600);
t(
  "password benar -> berhasil masuk",
  lastToast()?.kind === "success" && g.__navs.some((n: any) => n.to === "/"),
  lastToast(),
);
await unmount();

// 6) LUPA PASSWORD: email tidak valid ditolak sebelum mengirim kode
await mount();
await clickText("Lupa password?", 50);
t(
  "mode lupa password tampil (hanya field email)",
  $("h2")!.textContent === "Lupa password" &&
    !!byPlaceholder("E-mail") &&
    !byPlaceholder("Password"),
);
await type("E-mail", "bukan-email");
await clickText("Kirim kode", 100);
t(
  "email tidak valid di mode lupa password -> toast error",
  lastToast()?.kind === "error" && /alamat email yang valid/.test(lastToast().msg),
  lastToast(),
);

// 7) LUPA PASSWORD valid -> kode terkirim, masuk ke mode verifikasi
await type("E-mail", EMAIL);
await clickText("Kirim kode", 300);
t(
  "kode terkirim -> toast sukses & masuk mode verifikasi",
  lastToast()?.kind === "success" &&
    /Kode verifikasi dikirim/.test(lastToast().msg) &&
    $("h2")!.textContent === "Verifikasi email",
  lastToast(),
);
t(
  "layar verifikasi menampilkan field OTP + password baru + ulangi",
  !!byPlaceholder("123456") && !!byPlaceholder("Password baru") && !!byPlaceholder("Ulangi"),
);

// 8) Kode OTP salah -> ditolak
await type("123456", "000000");
await type("Password baru", "Baru123");
await type("Ulangi", "Baru123");
await clickText("Verifikasi", 200);
t(
  "kode OTP salah -> toast 'Kode salah, coba lagi'",
  lastToast()?.kind === "error" && /Kode salah, coba lagi/.test(lastToast().msg),
  lastToast(),
);

// 9) Kode OTP benar tapi password baru terlalu pendek
const otp1 = A.otps.get(EMAIL).code;
await type("123456", otp1);
await type("Password baru", "abc");
await clickText("Verifikasi", 200);
t(
  "OTP benar + password baru terlalu pendek -> toast kebijakan panjang",
  /minimal 6 karakter/.test(lastToast().msg),
  lastToast(),
);

// 10) Kode OTP benar + password baru valid tapi konfirmasi tidak sama
await type("Password baru", "Baru123");
await type("Ulangi", "Baru124");
await clickText("Verifikasi", 200);
t(
  "konfirmasi tidak sama -> toast error",
  /Konfirmasi password tidak sama/.test(lastToast().msg),
  lastToast(),
);

// 11) Kode OTP benar + password baru valid + konfirmasi sama -> berhasil, kembali ke mode Masuk
await type("Ulangi", "Baru123");
await clickText("Verifikasi", 600);
t(
  "reset berhasil -> toast sukses & kembali ke mode Masuk",
  lastToast()?.kind === "success" && $("h2")!.textContent === "Masuk",
  lastToast(),
);
t("password di 'server' benar-benar berubah", A.users.get(EMAIL).password === "Baru123");

// 12) Password lama tidak bisa dipakai lagi, password baru bisa
await type("E-mail", EMAIL);
await type("Password", "abcdef");
await clickText("Masuk", 400);
t(
  "password lama tidak bisa dipakai lagi",
  lastToast()?.kind === "error" && /Email atau password salah/.test(lastToast().msg),
  lastToast(),
);
await type("Password", "Baru123");
await clickText("Masuk", 600);
t("password baru bisa login", lastToast()?.kind === "success", lastToast());
await unmount();

// 13) Kode LAMA tidak berlaku lagi setelah minta kode BARU
await mount();
await clickText("Lupa password?", 50);
await type("E-mail", EMAIL);
await clickText("Kirim kode", 300);
const oldOtp = A.otps.get(EMAIL).code;
await unmount();
// Minta kode baru lewat sesi berbeda -> kode lama otomatis tidak berlaku lagi.
await mount();
await clickText("Lupa password?", 50);
await type("E-mail", EMAIL);
await clickText("Kirim kode", 300);
t("kode baru berbeda dari kode lama", A.otps.get(EMAIL).code !== oldOtp);
await type("123456", oldOtp); // pakai kode LAMA
await type("Password baru", "Lagi!999");
await type("Ulangi", "Lagi!999");
await clickText("Verifikasi", 500);
t("kode lama ditolak setelah ada kode baru", lastToast()?.kind === "error", lastToast());
await unmount();

// 14) GANTI PASSWORD di Settings
function AcctHarness() {
  g.__acct = useAccountSettings();
  return null;
}
A.current = { id: A.users.get(EMAIL)!.id, email: EMAIL };
document.body.innerHTML = "<div id=root></div>";
root = createRoot(document.getElementById("root")!);
await act(async () => {
  root.render(React.createElement(AcctHarness));
  await sleep(100);
});
g.__toasts.length = 0;
A.updates.length = 0;
await act(async () => {
  g.__acct.setNewPassword("abc");
});
await act(async () => {
  await g.__acct.changePassword();
});
t(
  "ganti password terlalu pendek -> notifikasi & TIDAK dikirim",
  /minimal 6 karakter/.test(lastToast()?.msg ?? "") && A.updates.length === 0,
  [lastToast(), A.updates],
);
await act(async () => {
  g.__acct.setNewPassword("passwordbaru");
});
await act(async () => {
  await g.__acct.changePassword();
});
t(
  "ganti password sah -> updateUser dipanggil",
  A.updates.length === 1 && A.updates[0] === "passwordbaru",
  A.updates,
);

// 15) Kode pemulihan (backup offline) di Settings — fitur berbeda dari OTP email di atas
t(
  "belum ada kode pemulihan dibuat -> sisa 0",
  g.__acct.recoveryRemaining === 0,
  g.__acct.recoveryRemaining,
);
await act(async () => {
  g.__acct.setRecoveryPassword("salah");
});
await act(async () => {
  await g.__acct.generateCodes();
});
t(
  "buat kode baru dengan password saat-ini yang salah -> ditolak",
  lastToast()?.kind === "error" && g.__acct.generatedCodes === null,
  lastToast(),
);
await act(async () => {
  g.__acct.setRecoveryPassword("passwordbaru");
});
await act(async () => {
  await g.__acct.generateCodes();
});
t(
  "buat kode baru dengan password saat-ini yang benar -> 10 kode",
  g.__acct.generatedCodes?.length === 10 && g.__acct.recoveryRemaining === 10,
  g.__acct.generatedCodes?.length,
);
await act(async () => {
  root.unmount();
});

console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
