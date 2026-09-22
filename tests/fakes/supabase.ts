// Supabase palsu di memori: cukup untuk syncNow/todoSync/scheduleSync + SyncStatus.
// Simpan di globalThis: modul ini bisa termuat dua kali (import langsung vs lewat alias tsconfig).
const G: any = globalThis;
G.__fake ??= {
  calls: { select: 0, upsert: 0, byTable: {} as Record<string, number> },
  db: {
    hasServerColumn: true,
    maxRows: 1000, // batas max-rows PostgREST
    onUpsert: null as null | (() => void),
    clock: Date.parse("2026-09-19T00:00:00Z"), // "jam server", naik tiap tulis
    tables: {} as Record<string, Map<string, any>>,
  },
};
G.__fake.auth ??= {
  mode: false,
  users: new Map<string, any>(),
  current: null as any,
  signUps: [] as any[],
  updates: [] as string[],
  metaUpdates: [] as any[],
  // Kode OTP "terkirim" (dipakai flow lupa password / verifikasi email), keyed by email.
  otps: new Map<string, { code: string; type: "signup" | "recovery" }>(),
  otpSeq: 0,
};
G.__fake.storage ??= { uploads: [] as any[], failUpload: false };
// Kode OTP 6-digit yang berbeda tiap dipanggil (dibungkus supaya cocok dengan input asli yang
// hanya menerima digit dan memotong ke 6 karakter).
function nextOtpCode(): string {
  G.__fake.auth.otpSeq = (G.__fake.auth.otpSeq + 1) % 1000000;
  return String(100000 + G.__fake.auth.otpSeq).slice(-6);
}
export const calls = G.__fake.calls;
export const db = G.__fake.db;
const tbl = (n: string) => (db.tables[n] ??= new Map());
export function serverTick() {
  db.clock += 10;
  return new Date(db.clock).toISOString();
}
export function seedServerRow(table: string, row: any, opts: { serverTs?: string } = {}) {
  tbl(table).set(row.id, { ...row, server_updated_at: opts.serverTs ?? serverTick() });
}
export function resetCalls() {
  calls.select = 0;
  calls.upsert = 0;
  calls.byTable = {};
}

class Q {
  f: Array<[string, string, string]> = [];
  o: Array<[string, boolean]> = [];
  lim = Infinity;
  constructor(private t: string) {}
  select() {
    return this;
  }
  gt(c: string, v: string) {
    this.f.push(["gt", c, v]);
    return this;
  }
  gte(c: string, v: string) {
    this.f.push(["gte", c, v]);
    return this;
  }
  order(c: string, opt: { ascending: boolean }) {
    this.o.push([c, opt.ascending]);
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  then(resolve: (v: any) => void) {
    calls.select++;
    calls.byTable[this.t] = (calls.byTable[this.t] ?? 0) + 1;
    if (this.f.some(([, c]) => c === "server_updated_at") && !db.hasServerColumn) {
      return resolve({
        data: null,
        error: { code: "42703", message: `column ${this.t}.server_updated_at does not exist` },
      });
    }
    let rows = [...tbl(this.t).values()].map((r) => {
      const c = { ...r };
      if (!db.hasServerColumn) delete c.server_updated_at;
      return c;
    });
    for (const [op, c, v] of this.f) {
      rows = rows.filter((r) => {
        const a = Date.parse(r[c]);
        const b = Date.parse(v);
        return op === "gt" ? a > b : a >= b;
      });
    }
    for (const [c, asc] of [...this.o].reverse()) {
      rows.sort((x, y) => {
        const cmp = String(x[c]) < String(y[c]) ? -1 : String(x[c]) > String(y[c]) ? 1 : 0;
        return asc ? cmp : -cmp;
      });
    }
    resolve({ data: rows.slice(0, Math.min(this.lim, db.maxRows)), error: null });
  }
}
export const supabase: any = {
  from(t: string) {
    return {
      select: () => new Q(t).select(),
      upsert: async (rows: any[]) => {
        calls.upsert++;
        if (db.onUpsert) {
          const f = db.onUpsert;
          db.onUpsert = null;
          await Promise.resolve();
          f();
        }
        for (const r of rows)
          tbl(t).set(r.id, { ...(tbl(t).get(r.id) ?? {}), ...r, server_updated_at: serverTick() });
        return { error: null };
      },
    };
  },
  storage: {
    from: (bucket: string) => ({
      remove: async () => ({ error: null }),
      download: async () => ({ data: null, error: null }),
      upload: async (path: string, blob: any, opts: any) => {
        const st = G.__fake.storage;
        st.uploads.push({ bucket, path, type: blob?.type, size: blob?.size, opts });
        if (st.failUpload) return { data: null, error: { message: "Bucket not found" } };
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/${bucket}/${path}` },
      }),
    }),
  },
  auth: {
    getSession: async () => {
      const a = G.__fake.auth;
      if (!a.mode)
        return {
          data: {
            session: { user: { id: G.__uid ?? "u1", email: "t@noteme.app", user_metadata: {} } },
          },
        };
      return {
        data: {
          session: a.current
            ? {
                access_token: "a.b.c",
                user: { id: a.current.id, email: a.current.email, user_metadata: {} },
              }
            : null,
        },
      };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signUp: async ({ email, password }: any) => {
      const a = G.__fake.auth;
      a.signUps.push({ email, password });
      if (a.users.has(email))
        return { data: { session: null }, error: { message: "User already registered" } };
      const u = { id: "user-" + (a.users.size + 1), password };
      a.users.set(email, u);
      a.current = { id: u.id, email };
      return { data: { session: { user: { id: u.id, email } } }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const a = G.__fake.auth;
      const u = a.users.get(email);
      if (!u || u.password !== password)
        return { data: { session: null }, error: { message: "Invalid login credentials" } };
      a.current = { id: u.id, email };
      return { data: { session: { user: { id: u.id, email } } }, error: null };
    },
    updateUser: async ({ password, data }: any) => {
      const a = G.__fake.auth;
      if (password !== undefined) {
        a.updates.push(password);
        // Update password yang "tersimpan" untuk user yang sedang punya sesi, supaya login
        // berikutnya dengan password baru benar-benar tervalidasi.
        if (a.current) {
          for (const u of a.users.values()) if (u.id === a.current.id) u.password = password;
        }
      }
      if (data) a.metaUpdates.push(data);
      return { error: null };
    },
    signOut: async () => {
      G.__fake.auth.current = null;
      return { error: null };
    },
    // Kirim ulang kode OTP: dipakai baik untuk verifikasi signup maupun lupa password.
    // Kode baru berbeda dari kode sebelumnya (6 digit, sama seperti input aslinya yang hanya
    // menerima digit), supaya kode LAMA benar-benar tidak berlaku lagi begitu kode baru diminta.
    resend: async ({ type, email }: any) => {
      G.__fake.auth.otps.set(email, { code: nextOtpCode(), type });
      return { error: null };
    },
    // Minta kode reset password dikirim ke email (mode "lupa password").
    resetPasswordForEmail: async (email: string) => {
      G.__fake.auth.otps.set(email, { code: nextOtpCode(), type: "recovery" });
      return { error: null };
    },
    // Verifikasi kode 6 digit yang "dikirim" ke email (signup ATAU lupa password).
    verifyOtp: async ({ email, token, type }: any) => {
      const a = G.__fake.auth;
      const rec = a.otps.get(email);
      if (!rec || rec.type !== type || rec.code !== token) {
        return { data: { session: null }, error: { message: "Invalid token" } };
      }
      // Sengaja TIDAK dihapus di sini: layar "verifikasi" bisa memanggil verifyOtp berulang
      // (tiap klik "Verifikasi") sebelum password baru lolos validasi lokal, jadi kode yang
      // sama harus tetap berlaku sampai diganti kode BARU (resend/resetPasswordForEmail).
      const u = a.users.get(email);
      const id = u?.id ?? "user-" + (a.users.size + 1);
      a.current = { id, email };
      return { data: { session: { user: { id, email } } }, error: null };
    },
  },
  channel: () => {
    const ch: any = {
      on: () => ch,
      subscribe: () => ch,
      send: async () => "ok",
      track: async () => "ok",
      untrack: async () => "ok",
      presenceState: () => ({}),
    };
    return ch;
  },
  removeChannel: async () => {},
};
