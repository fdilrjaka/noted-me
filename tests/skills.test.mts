/**
 * Tes pemanggilan skill lewat mention: @template menambah aturan UI ke prompt sistem,
 * pesan biasa tidak, dan mention di dalam lampiran atau kata lain tidak dihitung.
 */
const SRC = new URL("../src", import.meta.url).pathname;
const mention = await import(`${SRC}/features/ai/lib/skillMention.ts`);
const server = await import(`${SRC}/features/ai/chat.server.ts`);

let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (!cond) {
    fail++;
    console.log("FAIL", name, extra);
  } else console.log("ok  ", name);
}
const user = (content: string) => ({ role: "user" as const, content });
const bot = (content: string) => ({ role: "assistant" as const, content });
const has = (msgs: any[]) => mention.activeSkills(msgs).includes("template");

check("mention di awal pesan", has([user("@template rapikan tombol ini")]));
check("mention di tengah kalimat", has([user("tolong @template review komponen ini")]));
check("huruf besar tetap dikenali", has([user("@Template buat ulang halaman profil")]));
check("mention setelah kurung", has([user("(@template) ya")]));
check("tanpa mention: tidak aktif", !has([user("buatkan ringkasan bab 3")]));
check("kata 'template' tanpa @: tidak aktif", !has([user("pakai template laporan biasa")]));
check("@templates: tidak aktif", !has([user("lihat @templates folder")]));
check("@template-v2: tidak aktif", !has([user("pakai @template-v2")]));
check("email-like a@template.com: tidak aktif", !has([user("kirim ke a@template.com")]));
check(
  "mention di dalam lampiran: tidak aktif",
  !has([user('ringkas ini\n<lampiran nama="x.md">pakai @template di sini</lampiran>')]),
);
check(
  "mention di luar lampiran: aktif",
  has([user('@template cek\n<lampiran nama="x.md">isi biasa</lampiran>')]),
);
check("mention di pesan asisten: tidak aktif", !has([bot("ketik @template untuk aturan UI")]));
check(
  "aktif selama masih di riwayat",
  has([user("@template rapikan header"), bot("ok"), user("ubah lagi tombolnya")]),
);

const base = server.SYSTEM_PROMPT as string;
const plain = server.buildSystemPrompt([user("halo")]) as string;
const withSkill = server.buildSystemPrompt([user("@template rapikan header")]) as string;
check("tanpa mention: prompt sama dengan SYSTEM_PROMPT", plain === base);
check("dengan mention: prompt dasar tetap ada", withSkill.startsWith(base));
check(
  "dengan mention: aturan UI ikut",
  withSkill.length > base.length + 5000 &&
    withSkill.includes("SKILL @template AKTIF") &&
    withSkill.includes("Dilarang (tell template)"),
);
check("petunjuk file tetap ada saat skill aktif", withSkill.includes("noteme-file"));
check(
  "pesan yang dikirim ke gateway memakai prompt berskill",
  server.toGatewayMessages(withSkill, [user("@template x")])[0].content === withSkill,
);

console.log(fail === 0 ? "\nSEMUA OK" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
