import { useState } from "react";
import type { ClassType, ClassStatus, ScheduleClass } from "@/components/schedule/scheduleData";
import type { ScheduleDayId } from "@/components/schedule/DayTabs";
import { createClass, deleteClass, updateClass } from "@/lib/noteme/scheduleStore";

/**
 * State form tambah/edit jadwal kelas + handler submit/delete. Dipisah dari
 * SchedulePage karena ini satu unit logika sendiri (form modal), terpisah dari
 * render daftar kelas per hari.
 */
export function useClassForm(activeDay: ScheduleDayId) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [day, setDay] = useState<ScheduleDayId>(activeDay);
  const [time, setTime] = useState("");
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState<ClassType>("offline");
  const [status, setStatus] = useState<ClassStatus>("upcoming");
  const [lmsLabel, setLmsLabel] = useState("");
  const [lmsUrl, setLmsUrl] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setCourseName("");
    setLecturer("");
    setDay(activeDay);
    setTime("");
    setRoom("");
    setClassType("offline");
    setStatus("upcoming");
    setLmsLabel("");
    setLmsUrl("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ScheduleClass) => {
    setEditingId(item.id);
    setCourseName(item.courseName);
    setLecturer(item.lecturer || "");
    setDay(item.day);
    setTime(item.time);
    setRoom(item.room);
    setClassType(item.classType);
    setStatus(item.status);
    setLmsLabel(item.lmsLinks[0]?.label || "");
    setLmsUrl(item.lmsLinks[0]?.url || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lmsLinks = lmsUrl ? [{ label: lmsLabel || "Live Unpad", url: lmsUrl }] : [];

    if (editingId) {
      updateClass(editingId, {
        day,
        courseName,
        lecturer,
        time,
        room,
        classType,
        status,
        lmsLinks,
      });
    } else {
      createClass({
        day,
        courseName,
        lecturer,
        time,
        room,
        classType,
        status,
        lmsLinks,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteClass(id);
  };

  return {
    isModalOpen,
    setIsModalOpen,
    editingId,
    courseName,
    setCourseName,
    lecturer,
    setLecturer,
    day,
    setDay,
    time,
    setTime,
    room,
    setRoom,
    classType,
    setClassType,
    status,
    setStatus,
    lmsLabel,
    setLmsLabel,
    lmsUrl,
    setLmsUrl,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmit,
    handleDelete,
  };
}
