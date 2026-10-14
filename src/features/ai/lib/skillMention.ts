/**
 * Pemanggilan skill lewat mention di pesan pengguna, misalnya "@template buatkan ulang tombol ini".
 * Modul murni (tanpa DOM, tanpa teks skill) supaya aman di-import dari klien, mis. untuk
 * autocomplete "@" nanti. Teks skill-nya sendiri ada di skills.server.ts.
 */

export type SkillId = "template";

export const SKILL_MENTIONS: Record<SkillId, string> = {
  template: "@template",
};

/** Blok lampiran dibuang dulu: "@template" di dalam isi file bukan panggilan dari pengguna. */
const ATTACHMENT_BLOCK = /<lampiran\b[^>]*>[\s\S]*?<\/lampiran>/gi;

/** "@template" berdiri sendiri: di awal teks atau setelah spasi/tanda buka, bukan "@templates". */
const TEMPLATE_MENTION = /(?:^|[\s([{"'])@template(?![\w-])/i;

const PATTERNS: Record<SkillId, RegExp> = { template: TEMPLATE_MENTION };

type MessageLike = { role: string; content: string };

/**
 * Skill yang sedang dipanggil: dihitung dari pesan PENGGUNA dalam riwayat yang dikirim ke model.
 * Skill tetap aktif selama mention-nya masih ada di riwayat itu, jadi lanjutan seperti
 * "ubah lagi tombolnya" tidak perlu menulis @template ulang.
 */
export function activeSkills(messages: readonly MessageLike[]): SkillId[] {
  const found = new Set<SkillId>();
  for (const m of messages) {
    if (m.role !== "user" || typeof m.content !== "string") continue;
    const text = m.content.replace(ATTACHMENT_BLOCK, " ");
    for (const id of Object.keys(PATTERNS) as SkillId[]) {
      if (PATTERNS[id].test(text)) found.add(id);
    }
  }
  return [...found];
}
