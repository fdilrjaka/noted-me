import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, KeyRound, LogOut, Lock, Pencil, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { syncAndSignOut } from "@/features/auth/signOut";
import { PasswordHint } from "@/features/auth/components/PasswordHint";
import { RecoveryCodesDialog } from "@/features/auth/components/RecoveryCodesDialog";
import { useAvatarUpload } from "@/features/auth/hooks/useAvatarUpload";
import { OwnerAvatar } from "@/features/todo/components/OwnerAvatar";
import { useTodoOwner } from "@/features/todo/hooks/useTodoOwner";
import { clearGuestMode } from "@/lib/noteme/guestMode";
import { darkBtn } from "./buttonStyles";
import type { useAccountSettings } from "../hooks/useAccountSettings";
import type { SettingsDraft } from "../hooks/useSettingsDraft";

const inputCls =
  "glass-input w-full min-w-0 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 sm:grid-cols-[8rem_1fr]">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

/** Kolom tengah atas: profil, informasi dasar (nama, username, password, Student ID), keamanan. */
export function AccountSection({
  draft,
  account,
}: {
  draft: SettingsDraft;
  account: ReturnType<typeof useAccountSettings>;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const owner = useTodoOwner();
  const [editingPassword, setEditingPassword] = useState(false);
  const emailLabel = user?.email ?? "";
  const { fileInputRef, avatarUrl, uploadingPhoto, handlePickPhoto, handleRemovePhoto } =
    useAvatarUpload(user);
  const {
    newPassword,
    setNewPassword,
    savingPassword,
    changePassword,
    recoveryRemaining,
    recoveryPassword,
    setRecoveryPassword,
    generatingCodes,
    generateCodes,
    generatedCodes,
    clearGeneratedCodes,
  } = account;

  const handleSignOut = async () => {
    let ok = true;
    if (user) {
      ok = await syncAndSignOut(user.id);
    } else {
      await supabase.auth.signOut();
    }
    if (!ok) return;
    clearGuestMode();
    toast.success("Keluar — catatan tetap ada di perangkat");
    void navigate({ to: "/auth" });
  };

  return (
    <>
      <section id="sec-akun" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Account & Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-none">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto profil"
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <OwnerAvatar owner={owner} className="size-20 text-3xl" />
            )}
            {user && (
              <>
                <button
                  type="button"
                  aria-label="Ubah foto profil"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="press-sm absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-60"
                >
                  <Camera className="size-3.5" />
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    aria-label="Hapus foto profil"
                    onClick={() => void handleRemovePhoto()}
                    className="press-sm absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-input text-foreground active:scale-90"
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
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{user ? owner.name : "Belum login"}</p>
            {emailLabel && <p className="truncate text-sm text-muted-foreground">{emailLabel}</p>}
            {draft.studentId.trim() && (
              <p className="truncate text-sm text-muted-foreground">ID {draft.studentId.trim()}</p>
            )}
          </div>
        </div>

        <h3 className="mb-3 mt-7 text-lg font-semibold">Informasi Dasar</h3>
        <div className="flex flex-col gap-3">
          <Row label="Nama Lengkap">
            <div className="relative">
              <input
                value={draft.nickname}
                onChange={(e) => draft.setNickname(e.target.value)}
                disabled={!user}
                placeholder="Nama kamu"
                maxLength={40}
                className={`${inputCls} pr-9`}
              />
              <Pencil className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Row>
          <Row label="Email">
            <input value={emailLabel} readOnly disabled className={inputCls} />
          </Row>
          <Row label="Kata Sandi">
            <div className="relative">
              <input
                value="••••••••••••"
                readOnly
                disabled
                aria-label="Kata sandi tersembunyi"
                className={`${inputCls} pr-9`}
              />
              <button
                type="button"
                onClick={() => setEditingPassword((v) => !v)}
                disabled={!user}
                aria-label="Ubah kata sandi"
                className="press-sm absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          </Row>
          {editingPassword && (
            <div className="rounded-2xl border border-border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <KeyRound className="size-3.5" /> Ubah Password
              </p>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru"
                autoComplete="new-password"
                className={inputCls}
              />
              {newPassword && <PasswordHint password={newPassword} className="mt-2 px-1" />}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => void changePassword().then(() => setEditingPassword(false))}
                  disabled={savingPassword || !newPassword}
                  className={darkBtn}
                >
                  {savingPassword ? "Menyimpan…" : "Simpan Password"}
                </button>
                <button
                  onClick={() => {
                    setNewPassword("");
                    setEditingPassword(false);
                  }}
                  className="press-sm rounded-xl border border-border px-4 py-2 text-sm font-medium"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
          <Row label="Student ID">
            <div className="relative">
              <input
                value={draft.studentId}
                onChange={(e) => draft.setStudentId(e.target.value)}
                disabled={!user}
                placeholder="NPM / NIM"
                maxLength={30}
                className={`${inputCls} pr-9`}
              />
              <Pencil className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Row>
        </div>
      </section>

      <section id="sec-keamanan" className="scroll-mt-4">
        <h2 className="text-xl font-bold tracking-tight">Keamanan & Sandi</h2>
        {user ? (
          <div className="mt-4 rounded-2xl border border-border p-3.5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Kode Pemulihan
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Dipakai untuk mengatur ulang password kalau lupa.
              {recoveryRemaining !== null &&
                (recoveryRemaining > 0
                  ? ` Tersisa ${recoveryRemaining} kode.`
                  : " Belum ada kode aktif, buat sekarang.")}
            </p>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
                placeholder="Password saat ini"
                autoComplete="current-password"
                className={`${inputCls} pl-9`}
              />
            </div>
            <button
              onClick={() => void generateCodes()}
              disabled={generatingCodes || !recoveryPassword}
              className="press-sm mt-2 w-full rounded-xl border border-border py-2 text-sm font-medium disabled:opacity-50"
            >
              {generatingCodes
                ? "Membuat…"
                : recoveryRemaining
                  ? "Buat kode baru (kode lama hangus)"
                  : "Buat kode pemulihan"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Masuk dulu untuk mengatur keamanan akun.
          </p>
        )}
        <RecoveryCodesDialog codes={generatedCodes} onDone={clearGeneratedCodes} />

        <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-destructive">Zona Berbahaya</p>
          <button
            onClick={() => void handleSignOut()}
            className="press-sm flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium active:scale-95"
          >
            <LogOut className="size-4" /> Keluar
          </button>
          <button
            onClick={() =>
              toast("Hapus akun belum tersedia — hubungi dukungan untuk permintaan ini.")
            }
            className="press-sm mt-2 w-full rounded-xl py-2 text-sm font-medium text-destructive/80"
          >
            Hapus Akun
          </button>
        </div>
      </section>
    </>
  );
}
