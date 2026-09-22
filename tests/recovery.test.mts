const SRC = new URL("../src", import.meta.url).pathname;
const R = await import(`${SRC}/features/auth/recovery.server.ts`);
let fail = 0;
const t = (n: string, c: boolean, x: any = "") => {
  if (!c) {
    fail++;
    console.log("FAIL", n, x);
  } else console.log("ok  ", n);
};

function makeEnv() {
  const codes: any[] = [];
  const throttles = new Map<string, any>();
  const passwords = new Map<string, string>();
  let clock = Date.parse("2026-09-20T00:00:00Z");
  let failSetPassword = false;
  let seq = 0;
  const env: any = {
    store: {
      async insertBatch(rows: any[]) {
        for (const r of rows) {
          if (codes.some((c) => c.usernameKey === r.usernameKey && c.codeId === r.codeId))
            throw new Error("unique");
          codes.push({ id: "c" + ++seq, usedAt: null, ...r });
        }
      },
      async deleteOtherBatches(u: string, b: string) {
        for (let i = codes.length - 1; i >= 0; i--)
          if (codes[i].userId === u && codes[i].batchId !== b) codes.splice(i, 1);
      },
      async findCode(k: string, id: string) {
        const c = codes.find((x) => x.usernameKey === k && x.codeId === id);
        return c
          ? {
              id: c.id,
              userId: c.userId,
              salt: c.salt,
              iterations: c.iterations,
              hash: c.hash,
              usedAt: c.usedAt,
            }
          : null;
      },
      async markUsed(id: string, at: Date) {
        const c = codes.find((x) => x.id === id)!;
        if (c.usedAt) return false;
        c.usedAt = at.toISOString();
        return true;
      },
      async restoreUnused(id: string) {
        codes.find((x) => x.id === id)!.usedAt = null;
      },
      async countUnused(u: string) {
        return codes.filter((c) => c.userId === u && !c.usedAt).length;
      },
      async getThrottle(k: string) {
        return throttles.get(k) ?? null;
      },
      async saveThrottle(k: string, v: any) {
        throttles.set(k, v);
      },
      async clearThrottle(k: string) {
        throttles.delete(k);
      },
    },
    async setPassword(u: string, p: string) {
      if (failSetPassword) throw new Error("auth down");
      passwords.set(u, p);
    },
    now: () => new Date(clock),
    randomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    randomUUID: () => crypto.randomUUID(),
  };
  return {
    env,
    codes,
    passwords,
    advance: (ms: number) => {
      clock += ms;
    },
    setFail: (v: boolean) => {
      failSetPassword = v;
    },
  };
}
const GOOD = "Baru!123";
const mk = async (h: any, user = "u1", email = "budi@noteme.app") =>
  (await R.createRecoveryCodes(h.env, { userId: user, email })) as any;

// --- pembuatan
{
  const h = makeEnv();
  const r = await mk(h);
  t("membuat 10 kode", r.ok && r.codes.length === 10);
  t(
    "format XXXX-XXXX-XXXX-XXXX dari alfabet aman",
    r.codes.every((c: string) => /^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/.test(c)),
  );
  t(
    "semua kode unik & id unik",
    new Set(r.codes).size === 10 && new Set(r.codes.map((c: string) => c.slice(0, 4))).size === 10,
  );
  t(
    "hash tersimpan, bukan kode polos",
    h.codes.every((c: any) => !JSON.stringify(c).includes(r.codes[0].replace(/-/g, "").slice(4))),
  );
  t(
    "username_key baku",
    h.codes.every((c: any) => c.usernameKey === "budi"),
  );
  const r2 = await mk(h);
  t("batch baru mengganti yang lama (tetap 10 baris)", h.codes.length === 10);
  const old = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: r.codes[0],
    newPassword: GOOD,
  });
  t("kode batch lama tidak berlaku lagi", !old.ok);
  const nw = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: r2.codes[0],
    newPassword: GOOD,
  });
  t("kode batch baru berlaku", nw.ok && nw.remaining === 9, nw);
}
// --- akun tidak didukung
{
  const h = makeEnv();
  t("email non-noteme ditolak", (await mk(h, "u1", "x@gmail.com")).ok === false);
  t(
    "usernameFromEmail",
    R.usernameFromEmail("Budi@noteme.app") === "budi" &&
      R.usernameFromEmail("a b@noteme.app") === null &&
      R.usernameFromEmail("x@gmail.com") === null,
  );
}
// --- reset
{
  const h = makeEnv();
  const r = await mk(h);
  const messy = " " + r.codes[3].toLowerCase().replace(/-/g, " ") + " ";
  const ok = await R.resetPasswordWithCode(h.env, {
    username: "  BUDI ",
    code: messy,
    newPassword: GOOD,
  });
  t(
    "reset berhasil (huruf kecil/spasi/username kapital ditoleransi)",
    ok.ok && h.passwords.get("u1") === GOOD,
    ok,
  );
  const again = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: r.codes[3],
    newPassword: "Lain!456",
  });
  t("kode sekali pakai", !again.ok && h.passwords.get("u1") === GOOD);
}
// --- pesan seragam (anti-enumerasi)
{
  const h = makeEnv();
  const r = await mk(h);
  const wrongKnown = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: "AAAA-AAAA-AAAA-AAAA",
    newPassword: GOOD,
  });
  const unknownUser = await R.resetPasswordWithCode(h.env, {
    username: "tidakada",
    code: r.codes[0],
    newPassword: GOOD,
  });
  const malformed = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: "abc",
    newPassword: GOOD,
  });
  t(
    "pesan sama: kode salah / user tak ada / format salah",
    wrongKnown.message === unknownUser.message &&
      unknownUser.message === malformed.message &&
      wrongKnown.reason === "invalid",
    [wrongKnown, unknownUser, malformed],
  );
  t(
    "kode user A tidak bisa dipakai untuk username B",
    !(
      await R.resetPasswordWithCode(h.env, {
        username: "andi",
        code: r.codes[1],
        newPassword: GOOD,
      })
    ).ok,
  );
}
// --- kebijakan password
{
  const h = makeEnv();
  const r = await mk(h);
  const bad = await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: r.codes[0],
    newPassword: "abc",
  });
  t(
    "password terlalu pendek ditolak di server",
    !bad.ok && bad.reason === "password_policy" && /minimal 6 karakter/.test(bad.message),
  );
  t(
    "penolakan kebijakan tidak menghabiskan kode / tidak dihitung percobaan",
    (await h.env.store.countUnused("u1")) === 10 && !(await h.env.store.getThrottle("u:budi")),
  );
  t(
    "kode masih bisa dipakai dengan password sah",
    (
      await R.resetPasswordWithCode(h.env, {
        username: "budi",
        code: r.codes[0],
        newPassword: GOOD,
      })
    ).ok,
  );
}
// --- lockout
{
  const h = makeEnv();
  const r = await mk(h);
  for (let i = 0; i < 5; i++)
    await R.resetPasswordWithCode(h.env, {
      username: "budi",
      code: "BBBB-BBBB-BBBB-BBBB",
      newPassword: GOOD,
    });
  const locked = (await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: r.codes[0],
    newPassword: GOOD,
  })) as any;
  t(
    "percobaan ke-6 terkunci walau kodenya BENAR",
    !locked.ok &&
      locked.reason === "rate_limited" &&
      locked.retryAfterSeconds > 0 &&
      h.passwords.size === 0,
    locked,
  );
  h.advance(16 * 60 * 1000);
  t(
    "terbuka lagi setelah 15 menit",
    (
      await R.resetPasswordWithCode(h.env, {
        username: "budi",
        code: r.codes[0],
        newPassword: GOOD,
      })
    ).ok,
  );
  t("throttle dibersihkan setelah sukses", !(await h.env.store.getThrottle("u:budi")));
}
{
  const h = makeEnv();
  for (let i = 0; i < 5; i++)
    await R.resetPasswordWithCode(h.env, {
      username: "tidakada",
      code: "CCCC-CCCC-CCCC-CCCC",
      newPassword: GOOD,
    });
  const r = (await R.resetPasswordWithCode(h.env, {
    username: "tidakada",
    code: "CCCC-CCCC-CCCC-CCCC",
    newPassword: GOOD,
  })) as any;
  t("username tak terdaftar juga terkunci (tidak bisa dibedakan)", r.reason === "rate_limited");
}
{
  const h = makeEnv();
  const r = await mk(h);
  for (let i = 0; i < 4; i++)
    await R.resetPasswordWithCode(h.env, {
      username: "budi",
      code: "BBBB-BBBB-BBBB-BBBB",
      newPassword: GOOD,
    });
  h.advance(16 * 60 * 1000); // jendela habis -> hitungan mulai dari nol
  await R.resetPasswordWithCode(h.env, {
    username: "budi",
    code: "BBBB-BBBB-BBBB-BBBB",
    newPassword: GOOD,
  });
  t(
    "jendela kedaluwarsa mereset hitungan (1 gagal, belum terkunci)",
    (await h.env.store.getThrottle("u:budi")).fails === 1 &&
      !(await h.env.store.getThrottle("u:budi")).lockedUntil,
  );
}
// --- balapan
{
  const h = makeEnv();
  const r = await mk(h);
  const res = await Promise.all(
    [1, 2, 3, 4, 5].map((i) =>
      R.resetPasswordWithCode(h.env, {
        username: "budi",
        code: r.codes[0],
        newPassword: `Pw${i}!xyz`,
      }),
    ),
  );
  t(
    "5 permintaan bersamaan dengan kode sama: tepat 1 sukses",
    res.filter((x: any) => x.ok).length === 1,
    res.map((x: any) => x.ok),
  );
}
// --- kegagalan Auth
{
  const h = makeEnv();
  const r = await mk(h);
  h.setFail(true);
  let threw = false;
  try {
    await R.resetPasswordWithCode(h.env, { username: "budi", code: r.codes[0], newPassword: GOOD });
  } catch {
    threw = true;
  }
  t("gagal ganti password -> error dilempar", threw);
  t("... dan kode DIKEMBALIKAN (tidak hangus)", (await h.env.store.countUnused("u1")) === 10);
  h.setFail(false);
  t(
    "... sehingga bisa dicoba lagi",
    (
      await R.resetPasswordWithCode(h.env, {
        username: "budi",
        code: r.codes[0],
        newPassword: GOOD,
      })
    ).ok,
  );
}
// --- kualitas acak
{
  const h = makeEnv();
  const seen = new Map<string, number>();
  const ids = new Set<string>();
  let dupInBatch = false;
  for (let i = 0; i < 300; i++) {
    const r = await mk(makeEnv(), "u", "x@noteme.app");
    const b = r.codes.map((c: string) => c.slice(0, 4));
    if (new Set(b).size !== b.length) dupInBatch = true;
    for (const c of r.codes)
      for (const ch of c.replace(/-/g, "")) seen.set(ch, (seen.get(ch) ?? 0) + 1);
  }
  const counts = [...seen.values()];
  const total = counts.reduce((a, b) => a + b, 0);
  const exp = total / 31;
  t(
    "hanya 31 simbol, tanpa 0/1/I/L/O",
    seen.size === 31 && !["0", "1", "I", "L", "O"].some((c) => seen.has(c)),
  );
  t(
    "distribusi seragam (tiap simbol dalam ±15% dari harapan)",
    counts.every((c) => Math.abs(c - exp) / exp < 0.15),
    [Math.min(...counts) / exp, Math.max(...counts) / exp],
  );
  t("tidak ada id ganda dalam satu batch", !dupInBatch);
}
// --- waktu respons (anti-enumerasi, longgar)
{
  const h = makeEnv();
  const r = await mk(h);
  const time = async (u: string, code: string) => {
    const s = performance.now();
    for (let i = 0; i < 6; i++) {
      h.env.store.clearThrottle("u:" + u);
      await R.resetPasswordWithCode(h.env, { username: u, code, newPassword: GOOD });
    }
    return (performance.now() - s) / 6;
  };
  await time("budi", "BBBB-BBBB-BBBB-BBBB");
  const known = await time("budi", "BBBB-BBBB-BBBB-BBBB");
  const unknown = await time("tidakada", r.codes[0]);
  console.log(
    `   waktu rata-rata: user terdaftar+kode salah=${known.toFixed(1)}ms, user tak ada=${unknown.toFixed(1)}ms`,
  );
  t(
    "waktu respons user tak ada ~ sama dengan user terdaftar (rasio 0,5-2)",
    unknown / known > 0.5 && unknown / known < 2,
    [known, unknown],
  );
}
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
