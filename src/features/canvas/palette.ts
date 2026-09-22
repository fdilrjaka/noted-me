import type { ColorKey, NodeKind } from "@/lib/noteme/canvasStore";

/** solid = header/garis, soft = kertas sticky, ink = teks di atas soft. */
export const PALETTE: Record<
  ColorKey,
  { solid: string; soft: string; ink: string; label: string }
> = {
  blue: { solid: "#3b82f6", soft: "#dbeafe", ink: "#1e3a8a", label: "Biru" },
  orange: { solid: "#f97316", soft: "#ffedd5", ink: "#7c2d12", label: "Oranye" },
  green: { solid: "#22c55e", soft: "#dcfce7", ink: "#14532d", label: "Hijau" },
  purple: { solid: "#a855f7", soft: "#f3e8ff", ink: "#581c87", label: "Ungu" },
  red: { solid: "#ef4444", soft: "#fee2e2", ink: "#7f1d1d", label: "Merah" },
  yellow: { solid: "#eab308", soft: "#fef08a", ink: "#713f12", label: "Kuning" },
  pink: { solid: "#ec4899", soft: "#fce7f3", ink: "#831843", label: "Pink" },
  slate: { solid: "#64748b", soft: "#e2e8f0", ink: "#0f172a", label: "Abu" },
};

export const DEFAULT_COLOR: Record<NodeKind, ColorKey> = {
  todo: "orange",
  schedule: "blue",
  tracker: "green",
  note: "purple",
  sticky: "yellow",
  table: "slate",
  frame: "blue",
};

export const DEFAULT_TITLE: Record<NodeKind, string> = {
  todo: "To-Do List",
  schedule: "Jadwal Minggu Ini",
  tracker: "Tracker Tugas",
  note: "Catatan Kuliah",
  sticky: "Catatan cepat",
  table: "Tabel",
  frame: "Frame Baru",
};
