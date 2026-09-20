import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { importBackupJson } from "@/import-export/backupImport";
import { useSession } from "@/hooks/useSession";
import { passwordErrorMessage } from "@/lib/noteme/credentialPolicy";
import { generateRecoveryCodes, getRecoveryStatus } from "@/features/auth/recovery.functions";

/**
 * State & handler untuk kartu Akun di settings: ganti password + impor
 * cadangan JSON. Dipisah dari SettingsPage karena dua aksi ini punya
 * state/loading masing-masing yang gak nyambung ke section lain.
 */
export function useAccountSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Kode pemulihan: sisa kode (null = belum tahu / tidak tersedia), password konfirmasi untuk
  // membuat kode baru, dan kode yang baru dibuat (ditampilkan sekali di dialog).
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [recoveryRemaining, setRecoveryRemaining] = useState<number | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!userId) {
      setRecoveryRemaining(null);
      return;
    }
    let cancelled = false;
    getRecoveryStatus()
      .then((s) => {
        if (!cancelled) setRecoveryRemaining(s.remaining);
      })
      .catch(() => {
        if (!cancelled) setRecoveryRemaining(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function generateCodes() {
    if (!recoveryPassword) {
      toast.error("Masukkan password saat ini untuk membuat kode baru");
      return;
    }
    setGeneratingCodes(true);
    try {
      const res = await generateRecoveryCodes({ data: { password: recoveryPassword } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setGeneratedCodes(res.codes);
      setRecoveryRemaining(res.codes.length);
      setRecoveryPassword("");
    } catch {
      toast.error("Gagal membuat kode pemulihan. Coba lagi sebentar lagi");
    } finally {
      setGeneratingCodes(false);
    }
  }

  async function changePassword() {
    // Aturan yang sama dengan saat daftar (min. panjang + 1 karakter spesial).
    const policyError = passwordErrorMessage(newPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password berhasil diganti");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengganti password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportBusy(true);
    try {
      const result = await importBackupJson(file);
      toast.success(
        `Dipulihkan: ${result.subjects} mata kuliah, ${result.pages} catatan${
          result.images ? `, ${result.images} gambar` : ""
        }`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengimpor cadangan");
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return {
    newPassword,
    setNewPassword,
    savingPassword,
    changePassword,
    importBusy,
    importInputRef,
    handleImportFile,
    recoveryRemaining,
    recoveryPassword,
    setRecoveryPassword,
    generatingCodes,
    generateCodes,
    generatedCodes,
    clearGeneratedCodes: () => setGeneratedCodes(null),
  };
}
