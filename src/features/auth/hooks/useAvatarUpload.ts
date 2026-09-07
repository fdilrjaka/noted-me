import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { useSession } from "@/hooks/useSession";

// Warna fallback avatar kalau user belum (atau gak mau) pasang foto profil.
export const AVATAR_COLORS = ["#7c3aed", "#be185d", "#0369a1", "#047857", "#c2410c", "#525252"];

const AVATAR_SIZE_PX = 160; // sisi persegi thumbnail avatar sebelum dikompres

/** Kompres foto yang dipilih jadi thumbnail persegi kecil (data URL), biar muat nyaman
 * disimpan di user_metadata (gak butuh bucket Storage terpisah buat sesuatu sekecil ini). */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE_PX;
        canvas.height = AVATAR_SIZE_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas tidak didukung"));
          return;
        }
        // Crop persegi dari tengah gambar (cover), baru resize ke ukuran thumbnail.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function initialLetter(nickname: string, username: string) {
  const source = nickname.trim() || username.trim();
  return source ? source[0]!.toUpperCase() : "?";
}

/**
 * State & handler untuk kartu profil di AuthPage: nickname, warna/foto avatar,
 * dan penyimpanannya ke user_metadata Supabase. Dipisah dari AuthPage karena
 * ini satu unit "edit profil" tersendiri, terpisah dari alur login/signup.
 */
export function useAvatarUpload(user: ReturnType<typeof useSession>["user"]) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Muat nickname/foto/warna dari user_metadata tiap kali user (login/logout) berubah —
  // sengaja gak diikat ke seluruh objek `user` biar gak nimpa field yang lagi diedit user
  // di kartu ini gara-gara metadata di-refresh sama updateUser() kita sendiri.
  useEffect(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    setNickname(typeof meta["nickname"] === "string" ? meta["nickname"] : "");
    setAvatarColor(
      typeof meta["avatar_color"] === "string" ? meta["avatar_color"] : AVATAR_COLORS[0],
    );
    setAvatarUrl(typeof meta["avatar_url"] === "string" ? meta["avatar_url"] : null);
    setProfileDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function saveProfile(overrides?: { avatar_url?: string | null }) {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: nickname.trim(),
          avatar_color: avatarColor,
          avatar_url: overrides && "avatar_url" in overrides ? overrides.avatar_url : avatarUrl,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setProfileDirty(false);
      toast.success("Profil disimpan");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar");
      return;
    }
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      await saveProfile({ avatar_url: dataUrl });
    } catch {
      toast.error("Gagal memproses foto");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setAvatarUrl(null);
    await saveProfile({ avatar_url: null });
  }

  return {
    fileInputRef,
    nickname,
    setNickname,
    avatarColor,
    setAvatarColor,
    avatarUrl,
    profileDirty,
    setProfileDirty,
    savingProfile,
    uploadingPhoto,
    saveProfile,
    handlePickPhoto,
    handleRemovePhoto,
  };
}
