import { useNavigate } from "@tanstack/react-router";
import { Camera, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { useSession } from "@/hooks/useSession";
import { dirtyCount, useData } from "@/storage/local/dataCore";
import { syncNow } from "@/storage/sync-engine/syncNow";
import { AVATAR_COLORS, initialLetter, useAvatarUpload } from "../hooks/useAvatarUpload";

export function ProfileCard({ user }: { user: NonNullable<ReturnType<typeof useSession>["user"]> }) {
  const data = useData();
  const navigate = useNavigate();
  const {
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
  } = useAvatarUpload(user);

  const usernameLabel = user.email?.replace("@noteme.app", "") ?? "";

  return (
    <div className="glass-card spring-in mt-6 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto profil" className="size-16 rounded-full object-cover" />
          ) : (
            <div
              className="flex size-16 items-center justify-center rounded-full text-xl font-semibold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {initialLetter(nickname, usernameLabel)}
            </div>
          )}
          <button
            aria-label="Ubah foto profil"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="press-sm absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-60"
          >
            <Camera className="size-3.5" />
          </button>
          {avatarUrl && (
            <button
              aria-label="Hapus foto profil"
              onClick={() => void handleRemovePhoto()}
              className="press-sm absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-input text-foreground active:scale-90"
            >
              <X className="size-3.5" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handlePickPhoto(e.target.files?.[0])}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Masuk sebagai</p>
          <p className="truncate text-lg font-semibold">{usernameLabel}</p>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-muted-foreground">Nama panggilan</label>
        <input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setProfileDirty(true);
          }}
          placeholder="Panggil aku apa?"
          maxLength={40}
          className="glass-input mt-1.5 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-muted-foreground">
          Warna avatar (dipakai kalau tanpa foto)
        </label>
        <div className="mt-2 flex gap-2.5">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Pilih warna ${c}`}
              onClick={() => {
                setAvatarColor(c);
                setProfileDirty(true);
              }}
              className="press-sm size-8 rounded-full active:scale-90"
              style={{
                backgroundColor: c,
                outline: avatarColor === c ? "2px solid var(--ring)" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      {profileDirty && (
        <button
          onClick={() => void saveProfile()}
          disabled={savingProfile}
          className="press mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
        >
          {savingProfile ? "Menyimpan…" : "Simpan profil"}
        </button>
      )}

      <p className="mt-5 text-sm text-muted-foreground">
        {dirtyCount() > 0
          ? `${dirtyCount()} perubahan menunggu sinkronisasi.`
          : "Semua catatan tersinkron."}
      </p>

      <button
        onClick={async () => {
          await syncNow(user.id).catch(() => toast.error("Sinkronisasi gagal"));
          await supabase.auth.signOut();
          toast.success("Keluar — catatan tetap ada di perangkat");
          void navigate({ to: "/" });
        }}
        className="press mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium active:scale-95"
      >
        <LogOut className="size-4" /> Sinkron lalu keluar
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {data.subjects.filter((s) => !s.deleted).length} mata kuliah tersimpan
      </p>
    </div>
  );
}
