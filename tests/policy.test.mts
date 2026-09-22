const SRC = new URL("../src", import.meta.url).pathname;
const {
  checkPassword,
  passwordErrorMessage,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  isValidEmail,
  newEmailError,
  normalizeUsername,
} = await import(`${SRC}/lib/noteme/credentialPolicy.ts`);
let fail = 0;
const t = (n: string, c: boolean, x = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};

// --- password: hanya syarat panjang, TIDAK ada syarat karakter spesial lagi ---
t("password < 6 karakter -> issue 'length'", checkPassword("abc").includes("length"));
t("password 6+ karakter (huruf saja) -> tidak ada issue", checkPassword("abcdef").length === 0);
t(
  "password 6+ karakter (angka saja) -> tidak ada issue",
  checkPassword("123456").length === 0,
);
t(
  "password dengan karakter spesial tetap valid (bukan wajib, cuma boleh)",
  checkPassword("abc!de").length === 0,
);
t("pesan panjang", passwordErrorMessage("abc") === `Password minimal ${MIN_PASSWORD_LENGTH} karakter`);
t("pesan null saat valid", passwordErrorMessage("abcdef") === null);

// --- email: dipakai sebagai identitas login (bukan username) ---
t("normalizeEmail trim + lowercase", normalizeEmail("  Budi@Noteme.APP  ") === "budi@noteme.app");
t("email valid", isValidEmail("budi@noteme.app"));
t("email tanpa @ tidak valid", !isValidEmail("budinoteme.app"));
t("email tanpa domain tidak valid", !isValidEmail("budi@"));
t("email dengan spasi tidak valid", !isValidEmail("budi @noteme.app"));
t("newEmailError null utk email valid", newEmailError("budi@noteme.app") === null);
t(
  "newEmailError berisi pesan utk email tidak valid",
  /alamat email yang valid/.test(newEmailError("bukan-email")!),
);

// --- normalizeUsername: legacy, hanya dipakai subsistem kode pemulihan LAMA (recovery.server.ts) ---
t("normalize lenient utk login lama", normalizeUsername(" Budi Santoso ") === "budisantoso");
t("normalize buang simbol tak dikenal", normalizeUsername("Budi!!01") === "budi01");

process.exit(fail ? 1 : 0);
