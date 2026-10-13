import { useCallback, useEffect, useRef, useState } from "react";
import { generateAiTitle, sendAiChat } from "@/features/ai/chat.functions";
import { deleteChat, listChats, saveChat, stripForStorage } from "../lib/history";
import { buildWireMessages } from "../lib/wire";
import { uid } from "@/storage/local/dataCore";
import type { AiAttachment, AiChat, AiMessage } from "../types";

const DEFAULT_TITLE = "Percakapan baru";

function makeChat(userId: string): AiChat {
  const t = new Date().toISOString();
  return { id: uid(), userId, title: DEFAULT_TITLE, createdAt: t, updatedAt: t, messages: [] };
}

function fallbackTitle(text: string, attachments: AiAttachment[]): string {
  const line = text.trim().split("\n")[0] ?? "";
  const base = line || attachments[0]?.name || DEFAULT_TITLE;
  return base.length > 40 ? `${base.slice(0, 37)}…` : base;
}

function errorText(err: unknown): string {
  if (err instanceof Error && /unauthorized|not authenticated|jwt/i.test(err.message)) {
    return "Sesi login berakhir. Masuk lagi lalu kirim ulang.";
  }
  return "Tidak bisa terhubung ke server. Cek koneksi internet, lalu kirim ulang.";
}

/**
 * State percakapan AI. Gateway tidak streaming, jadi satu giliran = satu request yang ditunggu
 * sampai selesai. Pembatalan bersifat sisi-klien: hasil yang telat datang diabaikan (server tetap
 * bisa menyelesaikan request-nya).
 */
export function useAiChat(userId: string) {
  const [chats, setChats] = useState<AiChat[]>([]);
  const [active, setActive] = useState<AiChat>(() => makeChat(userId));
  const [sending, setSending] = useState(false);
  const activeRef = useRef(active);
  const requestRef = useRef(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void listChats(userId).then((list) => {
      if (alive) setChats(list);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const commit = useCallback((chat: AiChat) => {
    activeRef.current = chat;
    setActive(chat);
    if (chat.messages.length === 0) return;
    void saveChat(chat);
    setChats((prev) => [stripForStorage(chat), ...prev.filter((c) => c.id !== chat.id)]);
  }, []);

  const setBusy = useCallback((busy: boolean) => {
    sendingRef.current = busy;
    setSending(busy);
  }, []);

  const request = useCallback(
    async (chat: AiChat) => {
      const token = ++requestRef.current;
      setBusy(true);

      let ok = false;
      let content = "";
      try {
        const res = await sendAiChat({ data: { messages: buildWireMessages(chat.messages) } });
        ok = res.ok;
        content = res.ok ? res.content : res.message;
      } catch (err) {
        content = errorText(err);
      }
      if (token !== requestRef.current) return; // dibatalkan / pindah percakapan

      const reply: AiMessage = {
        id: uid(),
        role: "assistant",
        text: content,
        createdAt: new Date().toISOString(),
        ...(ok ? {} : { error: true }),
      };
      const cur = activeRef.current;
      commit({ ...cur, updatedAt: reply.createdAt, messages: [...cur.messages, reply] });
      setBusy(false);

      if (ok && chat.messages.length === 1) {
        const first = chat.messages[0]!;
        void generateAiTitle({ data: { user: first.text || chat.title, assistant: content } })
          .then((t) => {
            if (t.ok && activeRef.current.id === chat.id) {
              commit({ ...activeRef.current, title: t.title });
            }
          })
          .catch(() => undefined);
      }
    },
    [commit, setBusy],
  );

  const send = useCallback(
    async (text: string, attachments: AiAttachment[]) => {
      if (sendingRef.current) return;
      const base = activeRef.current;
      const now = new Date().toISOString();
      const message: AiMessage = {
        id: uid(),
        role: "user",
        text: text.trim(),
        createdAt: now,
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      const next: AiChat = {
        ...base,
        title: base.messages.length === 0 ? fallbackTitle(text, attachments) : base.title,
        updatedAt: now,
        messages: [...base.messages, message],
      };
      commit(next);
      await request(next);
    },
    [commit, request],
  );

  /** Ulangi giliran terakhir: buang jawaban/galat di ujung, kirim ulang pesan pengguna terakhir. */
  const retry = useCallback(async () => {
    if (sendingRef.current) return;
    const cur = activeRef.current;
    let messages = cur.messages;
    while (messages.length > 0 && messages[messages.length - 1]?.role === "assistant") {
      messages = messages.slice(0, -1);
    }
    if (messages.length === 0) return;
    const next = { ...cur, messages, updatedAt: new Date().toISOString() };
    commit(next);
    await request(next);
  }, [commit, request]);

  const cancel = useCallback(() => {
    if (!sendingRef.current) return;
    requestRef.current++;
    setBusy(false);
    const cur = activeRef.current;
    const note: AiMessage = {
      id: uid(),
      role: "assistant",
      text: "Permintaan dibatalkan.",
      createdAt: new Date().toISOString(),
      error: true,
    };
    commit({ ...cur, updatedAt: note.createdAt, messages: [...cur.messages, note] });
  }, [commit, setBusy]);

  const abandonPending = useCallback(() => {
    requestRef.current++;
    setBusy(false);
  }, [setBusy]);

  const newChat = useCallback(() => {
    if (activeRef.current.messages.length === 0) return;
    abandonPending();
    commit(makeChat(userId));
  }, [abandonPending, commit, userId]);

  const selectChat = useCallback(
    (id: string) => {
      const found = chats.find((c) => c.id === id);
      if (!found || found.id === activeRef.current.id) return;
      abandonPending();
      commit(found);
    },
    [abandonPending, chats, commit],
  );

  const removeChat = useCallback(
    (id: string) => {
      void deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeRef.current.id === id) {
        abandonPending();
        commit(makeChat(userId));
      }
    },
    [abandonPending, commit, userId],
  );

  return { chats, active, sending, send, retry, cancel, newChat, selectChat, removeChat };
}
