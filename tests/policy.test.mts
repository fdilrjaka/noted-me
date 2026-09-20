const SRC = new URL("../src", import.meta.url).pathname;
const { checkPassword, passwordErrorMessage, newUsernameError, normalizeUsername } = await import(
  `${SRC}/lib/noteme/credentialPolicy.ts`
);
let fail = 0;
const t = (n: string, c: boolean, x = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};
t("tanpa spesial ditolak", checkPassword("abcdef1").includes("special"));
t("spesial diterima", checkPassword("abc!def").length === 0);
for (const ch of "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~")
  t(`simbol ${ch} dihitung`, checkPassword("abcde" + ch).length === 0);
t("spasi BUKAN spesial", checkPassword("abc def").includes("special"));
t("huruf/angka bukan spesial", checkPassword("Abc12345").includes("special"));
t("pendek + tanpa spesial -> 2 isu", checkPassword("ab").length === 2);
t("pesan spesial", /karakter spesial/.test(passwordErrorMessage("abcdef")!));
t(
  "pesan panjang",
  passwordErrorMessage("a!")!.startsWith("Password minimal 6 karakter") &&
    !/spesial/.test(passwordErrorMessage("a!")!),
);
t("pesan gabungan", /minimal 6 karakter dan/.test(passwordErrorMessage("ab")!));
t("valid -> null", passwordErrorMessage("abc!123") === null);
t("username valid", newUsernameError("budi_01") === null);
t("username spasi ditolak", newUsernameError("budi santoso") !== null);
t("username @ ditolak (dulu diam-diam dibuang)", newUsernameError("a@b.com") !== null);
t("username pendek", /minimal/.test(newUsernameError("ab")!));
t("username kapital ok (di-lowercase)", newUsernameError("Budi") === null);
t("normalize lenient utk login lama", normalizeUsername(" Budi Santoso ") === "budisantoso");
process.exit(fail ? 1 : 0);
