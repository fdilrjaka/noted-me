// Server function palsu untuk tes UI chat AI. Setiap panggilan dicatat dan dijawab oleh
// handler yang bisa diganti per tes lewat globalThis.__ai.
const G: any = globalThis;
G.__ai ??= {
  calls: [] as any[],
  titleCalls: [] as any[],
  handler: null as null | ((data: any) => Promise<any>),
};
export const sendAiChat = async ({ data }: { data: any }) => {
  G.__ai.calls.push(data);
  return G.__ai.handler ? G.__ai.handler(data) : { ok: true, content: "ok" };
};
export const generateAiTitle = async ({ data }: { data: any }) => {
  G.__ai.titleCalls.push(data);
  return { ok: true, title: "Judul Otomatis" };
};
