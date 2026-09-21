-- Tag per task (filter & urut berdasarkan tag di To Do List).
ALTER TABLE public.todo_tasks
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
