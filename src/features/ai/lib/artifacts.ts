/**
 * "Artifact" = file yang dibuat AI di dalam sebuah jawaban. Murni (tanpa DOM): dipakai panel kanan
 * untuk daftar file, nomor versi (file bernama sama yang direvisi AI), dan kunci pembuka panel.
 */
import type { AiMessage } from "../types";
import { extractFiles, type FileSpec } from "./fileSpec";

export type Artifact = {
  /** `${messageId}:${indeks}` — stabil selama pesan ada; dipakai sebagai kunci edit dan buka-panel. */
  key: string;
  messageId: string;
  index: number;
  spec: FileSpec;
  /** Nama + format yang sama dianggap versi berbeda dari file yang sama. */
  group: string;
  version: number;
  versions: number;
};

export const artifactKey = (messageId: string, index: number): string => `${messageId}:${index}`;

export const groupOf = (spec: FileSpec): string => `${spec.format}:${spec.filename.toLowerCase()}`;

export function collectArtifacts(messages: AiMessage[]): Artifact[] {
  const found: Artifact[] = [];
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (m.role !== "assistant" || m.error) continue;
    extractFiles(m.text).files.forEach((spec, index) => {
      const group = groupOf(spec);
      const version = (counts.get(group) ?? 0) + 1;
      counts.set(group, version);
      found.push({
        key: artifactKey(m.id, index),
        messageId: m.id,
        index,
        spec,
        group,
        version,
        versions: 0,
      });
    });
  }
  return found.map((a) => ({ ...a, versions: counts.get(a.group) ?? 1 }));
}

/** Kunci file pertama di pesan terakhir, kalau pesan itu jawaban AI yang memuat file. */
export function firstArtifactKeyOf(message: AiMessage | undefined): string | null {
  if (!message || message.role !== "assistant" || message.error) return null;
  return extractFiles(message.text).files.length > 0 ? artifactKey(message.id, 0) : null;
}
