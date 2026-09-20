import { useSession } from "@/hooks/useSession";
import { AVATAR_COLORS } from "@/features/auth/hooks/useAvatarUpload";

/** Nama & avatar akun yang sedang login (dipakai di top bar dan header kolom). */
export function useTodoOwner() {
  const { user } = useSession();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const username = user?.email?.replace("@noteme.app", "") ?? "";
  const nickname = typeof meta["nickname"] === "string" ? (meta["nickname"] as string).trim() : "";
  const name = nickname || username || "Kamu";
  return {
    name,
    initial: name[0]?.toUpperCase() ?? "?",
    avatarUrl: typeof meta["avatar_url"] === "string" ? (meta["avatar_url"] as string) : null,
    color:
      typeof meta["avatar_color"] === "string"
        ? (meta["avatar_color"] as string)
        : AVATAR_COLORS[0]!,
  };
}

export type TodoOwner = ReturnType<typeof useTodoOwner>;
