import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { setNotifPref, useNotifPrefs } from "@/lib/noteme/notifPrefs";

/**
 * Draft untuk isian yang baru berlaku setelah "Simpan Perubahan" (nama, Student ID, pengingat).
 * "Batal" mengembalikan semuanya ke nilai tersimpan. Mode tampilan sengaja di luar draft
 * karena langsung berlaku (ada preview animasinya).
 */
export function useSettingsDraft() {
  const { user } = useSession();
  const savedPrefs = useNotifPrefs();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const savedNickname = typeof meta["nickname"] === "string" ? (meta["nickname"] as string) : "";
  const savedStudentId =
    typeof meta["student_id"] === "string" ? (meta["student_id"] as string) : "";

  const [nickname, setNickname] = useState(savedNickname);
  const [studentId, setStudentId] = useState(savedStudentId);
  const [todoReminders, setTodoReminders] = useState(savedPrefs.todoReminders);
  const [scheduleReminders, setScheduleReminders] = useState(savedPrefs.scheduleReminders);
  const [saving, setSaving] = useState(false);

  // Muat ulang draft saat akun berganti (login/logout), bukan tiap metadata berubah,
  // supaya isian yang sedang diketik tidak tertimpa.
  useEffect(() => {
    setNickname(savedNickname);
    setStudentId(savedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setTodoReminders(savedPrefs.todoReminders);
    setScheduleReminders(savedPrefs.scheduleReminders);
  }, [savedPrefs.todoReminders, savedPrefs.scheduleReminders]);

  const profileDirty =
    !!user && (nickname.trim() !== savedNickname || studentId.trim() !== savedStudentId);
  const dirty =
    profileDirty ||
    todoReminders !== savedPrefs.todoReminders ||
    scheduleReminders !== savedPrefs.scheduleReminders;

  async function save() {
    setSaving(true);
    try {
      if (profileDirty) {
        const { error } = await supabase.auth.updateUser({
          data: { nickname: nickname.trim(), student_id: studentId.trim() },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      if (todoReminders !== savedPrefs.todoReminders) setNotifPref("todoReminders", todoReminders);
      if (scheduleReminders !== savedPrefs.scheduleReminders) {
        setNotifPref("scheduleReminders", scheduleReminders);
      }
      toast.success("Perubahan disimpan");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setNickname(savedNickname);
    setStudentId(savedStudentId);
    setTodoReminders(savedPrefs.todoReminders);
    setScheduleReminders(savedPrefs.scheduleReminders);
  }

  return {
    nickname,
    setNickname,
    studentId,
    setStudentId,
    todoReminders,
    setTodoReminders,
    scheduleReminders,
    setScheduleReminders,
    dirty,
    saving,
    save,
    cancel,
  };
}

export type SettingsDraft = ReturnType<typeof useSettingsDraft>;
