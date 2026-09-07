import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { importBackupJson } from "@/import-export/backupImport";

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

  async function changePassword() {
    if (newPassword.trim().length < 6) {
      toast.error("Password minimal 6 karakter");
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
  };
}
