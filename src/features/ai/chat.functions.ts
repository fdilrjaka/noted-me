/**
 * Server function chat AI. File *.functions.ts ikut ke bundle client, jadi modul server
 * (chat.server) hanya di-import dinamis DI DALAM handler. Wajib login lewat requireSupabaseAuth.
 * Kegagalan yang wajar dikembalikan sebagai objek (bukan di-throw) supaya pesannya sampai ke UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseWireMessages } from "./lib/wire";

export type AiChatResult =
  | { ok: true; content: string }
  | {
      ok: false;
      reason: "not_configured" | "gateway" | "timeout" | "empty";
      message: string;
    };

export type AiTitleResult = { ok: true; title: string } | { ok: false };

const NOT_CONFIGURED =
  "AI belum diaktifkan di server. Isi AI_GATEWAY_URL, AI_GATEWAY_KEY, dan AI_MODEL (lihat docs/AI.md).";

export const sendAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ({ messages: parseWireMessages(input) }))
  .handler(async ({ data }): Promise<AiChatResult> => {
    const server = await import("./chat.server");
    const cfg = server.readGatewayConfig(process.env);
    if (!cfg) return { ok: false, reason: "not_configured", message: NOT_CONFIGURED };

    return server.callGateway(cfg, {
      messages: server.toGatewayMessages(server.buildSystemPrompt(data.messages), data.messages),
      maxTokens: 6000,
    });
  });

function asTitleInput(input: unknown): { user: string; assistant: string } {
  const o = (input ?? {}) as { user?: unknown; assistant?: unknown };
  if (typeof o.user !== "string" || typeof o.assistant !== "string") {
    throw new Error("Permintaan tidak valid");
  }
  if (o.user.length === 0 || o.user.length > 20_000 || o.assistant.length > 200_000) {
    throw new Error("Permintaan tidak valid");
  }
  return { user: o.user, assistant: o.assistant };
}

/** Judul percakapan otomatis. Best-effort: kalau gagal, klien memakai judul cadangan. */
export const generateAiTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(asTitleInput)
  .handler(async ({ data }): Promise<AiTitleResult> => {
    const server = await import("./chat.server");
    const cfg = server.readGatewayConfig(process.env);
    if (!cfg) return { ok: false };

    const res = await server.callGateway(
      cfg,
      { messages: server.buildTitleMessages(data.user, data.assistant), maxTokens: 24 },
      { timeoutMs: 20_000 },
    );
    if (!res.ok) return { ok: false };
    const title = server.cleanTitle(res.content);
    return title ? { ok: true, title } : { ok: false };
  });
