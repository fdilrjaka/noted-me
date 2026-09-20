-- Progres per task (0–100) untuk tampilan kartu To Do List.
-- Baris lama yang sudah completed akan diperlakukan 100% oleh klien.
ALTER TABLE public.todo_tasks
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0
  CHECK (progress BETWEEN 0 AND 100);
