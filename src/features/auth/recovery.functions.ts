/**
 * Server function untuk kode pemulihan. File *.functions.ts ikut ke bundle client, jadi semua
 * modul server (client.server, recovery.*.server) hanya di-import dinamis DI DALAM handler.
 * Hasil yang diharapkan (salah kode, dll.) dikembalikan sebagai objek, bukan di-throw, supaya
 * pesannya sampai ke UI apa adanya.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GenerateCodesResult =
  | { ok: true; codes: string[] }
  | { ok: false; reason: "wrong_password" | "unsupported_account"; message: string };

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") throw new Error("Permintaan tidak valid");
  return input as Record<string, unknown>;
}

function asString(value: unknown, max = 256): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw new Error("Permintaan tidak valid");
  }
  return value;
}

/** Buat (atau ganti) 10 kode pemulihan. Wajib login DAN memasukkan password saat ini. */
export const generateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ({ password: asString(asObject(input)["password"]) }))
  .handler(async ({ data, context }): Promise<GenerateCodesResult> => {
    const email = typeof context.claims["email"] === "string" ? context.claims["email"] : "";
    const [{ createRecoveryCodes }, { createRecoveryEnv, verifyPassword }] = await Promise.all([
      import("./recovery.server"),
      import("./recovery.env.server"),
    ]);

    // Sesi yang tercuri tidak boleh cukup untuk mencetak kode pemulihan (= merebut akun).
    if (!(await verifyPassword(email, data.password))) {
      return { ok: false, reason: "wrong_password", message: "Password salah" };
    }
    return createRecoveryCodes(createRecoveryEnv(), { userId: context.userId, email });
  });

/** Jumlah kode yang belum terpakai (untuk kartu di Pengaturan). */
export const getRecoveryStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ remaining: number }> => {
    const [{ recoveryStatus }, { createRecoveryEnv }] = await Promise.all([
      import("./recovery.server"),
      import("./recovery.env.server"),
    ]);
    return recoveryStatus(createRecoveryEnv(), context.userId);
  });

export type ResetPasswordResult =
  | { ok: true; remaining: number }
  | {
      ok: false;
      reason: "password_policy" | "invalid" | "rate_limited";
      message: string;
      retryAfterSeconds?: number;
    };

/** Lupa password: username + salah satu kode pemulihan + password baru. Tanpa login. */
export const resetPasswordWithRecoveryCode = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = asObject(input);
    return {
      username: asString(o["username"], 64),
      code: asString(o["code"], 64),
      newPassword: asString(o["newPassword"], 200),
    };
  })
  .handler(async ({ data }): Promise<ResetPasswordResult> => {
    const [{ resetPasswordWithCode }, { createRecoveryEnv }] = await Promise.all([
      import("./recovery.server"),
      import("./recovery.env.server"),
    ]);
    return resetPasswordWithCode(createRecoveryEnv(), data);
  });
