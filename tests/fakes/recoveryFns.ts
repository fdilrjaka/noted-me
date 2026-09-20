// Server function palsu: menjalankan logika server ASLI (recovery.server.ts) dengan store di memori.
import * as R from "../../src/features/auth/recovery.server.ts";
const G: any = globalThis;
const codes: any[] = [];
const throttles = new Map<string, any>();
let seq = 0;
const env: any = {
  store: {
    async insertBatch(rows: any[]) {
      for (const r of rows) codes.push({ id: "c" + ++seq, usedAt: null, ...r });
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
  async setPassword(userId: string, pw: string) {
    for (const u of G.__fake.auth.users.values()) if (u.id === userId) u.password = pw;
  },
  now: () => new Date(),
  randomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
  randomUUID: () => crypto.randomUUID(),
};
export const generateRecoveryCodes = async ({ data }: any) => {
  const a = G.__fake.auth;
  if (!a.current) throw new Error("Unauthorized");
  if (a.users.get(a.current.email)?.password !== data.password)
    return { ok: false, reason: "wrong_password", message: "Password salah" };
  return R.createRecoveryCodes(env, { userId: a.current.id, email: a.current.email });
};
export const getRecoveryStatus = async () => ({
  remaining: await env.store.countUnused(G.__fake.auth.current.id),
});
export const resetPasswordWithRecoveryCode = async ({ data }: any) =>
  R.resetPasswordWithCode(env, data);
