/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Implementasi nyata RecoveryEnv di atas Supabase (service role). Hanya boleh di-import dari
 * dalam handler server function (dynamic import) atau dari modul *.server.ts lain.
 *
 * Tabel recovery_codes / recovery_throttle belum ada di types.ts (file itu digenerate),
 * makanya client dicast ke bentuk longgar.
 */
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { RecoveryEnv, RecoveryStore, Throttle } from "./recovery.server";

const db = () => supabaseAdmin as unknown as { from: (table: string) => any };

function fail(action: string, error: { message?: string } | null): never {
  throw new Error(`recovery: ${action} gagal${error?.message ? ` (${error.message})` : ""}`);
}

const store: RecoveryStore = {
  async insertBatch(rows) {
    const { error } = await db()
      .from("recovery_codes")
      .insert(
        rows.map((r) => ({
          user_id: r.userId,
          username_key: r.usernameKey,
          batch_id: r.batchId,
          code_id: r.codeId,
          salt: r.salt,
          iterations: r.iterations,
          code_hash: r.hash,
        })),
      );
    if (error) fail("menyimpan kode", error);
  },

  async deleteOtherBatches(userId, batchId) {
    const { error } = await db()
      .from("recovery_codes")
      .delete()
      .eq("user_id", userId)
      .neq("batch_id", batchId);
    if (error) fail("menghapus kode lama", error);
  },

  async findCode(usernameKey, codeId) {
    const { data, error } = await db()
      .from("recovery_codes")
      .select("id, user_id, salt, iterations, code_hash, used_at")
      .eq("username_key", usernameKey)
      .eq("code_id", codeId)
      .maybeSingle();
    if (error) fail("mencari kode", error);
    if (!data) return null;
    return {
      id: String(data.id),
      userId: String(data.user_id),
      salt: String(data.salt),
      iterations: Number(data.iterations),
      hash: String(data.code_hash),
      usedAt: data.used_at ? String(data.used_at) : null,
    };
  },

  async markUsed(id, at) {
    const { data, error } = await db()
      .from("recovery_codes")
      .update({ used_at: at.toISOString() })
      .eq("id", id)
      .is("used_at", null)
      .select("id");
    if (error) fail("menandai kode terpakai", error);
    return Array.isArray(data) && data.length === 1;
  },

  async restoreUnused(id) {
    const { error } = await db().from("recovery_codes").update({ used_at: null }).eq("id", id);
    if (error) fail("memulihkan kode", error);
  },

  async countUnused(userId) {
    const { count, error } = await db()
      .from("recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("used_at", null);
    if (error) fail("menghitung kode", error);
    return count ?? 0;
  },

  async getThrottle(key) {
    const { data, error } = await db()
      .from("recovery_throttle")
      .select("fails, window_started_at, locked_until")
      .eq("key", key)
      .maybeSingle();
    if (error) fail("membaca pembatas", error);
    if (!data) return null;
    return {
      fails: Number(data.fails),
      windowStartedAt: String(data.window_started_at),
      lockedUntil: data.locked_until ? String(data.locked_until) : null,
    } satisfies Throttle;
  },

  async saveThrottle(key, t) {
    const { error } = await db().from("recovery_throttle").upsert(
      {
        key,
        fails: t.fails,
        window_started_at: t.windowStartedAt,
        locked_until: t.lockedUntil,
      },
      { onConflict: "key" },
    );
    if (error) fail("menyimpan pembatas", error);
  },

  async clearThrottle(key) {
    const { error } = await db().from("recovery_throttle").delete().eq("key", key);
    if (error) fail("menghapus pembatas", error);
  },
};

export function createRecoveryEnv(): RecoveryEnv {
  return {
    store,
    async setPassword(userId, password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) fail("mengganti password", error);
    },
    now: () => new Date(),
    randomBytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
    randomUUID: () => crypto.randomUUID(),
  };
}

// Sama seperti wrapper di auth-middleware.ts: kunci API format baru (sb_publishable_...) bukan JWT,
// jadi tidak boleh dikirim sebagai Bearer.
function newKeyAwareFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (
      (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${key}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** True kalau email+password benar. Klien sekali pakai, tidak menyimpan sesi apa pun. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("recovery: konfigurasi Supabase tidak lengkap");
  const client = createClient(url, key, {
    global: { fetch: newKeyAwareFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}
