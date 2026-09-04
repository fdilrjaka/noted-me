CREATE TABLE public.todo_sections (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_sections TO authenticated;
GRANT ALL ON public.todo_sections TO service_role;
ALTER TABLE public.todo_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own todo sections" ON public.todo_sections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.todo_tasks (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  section_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  deadline TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_tasks TO authenticated;
GRANT ALL ON public.todo_tasks TO service_role;
ALTER TABLE public.todo_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own todo tasks" ON public.todo_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX todo_sections_user_updated_idx ON public.todo_sections (user_id, updated_at);
CREATE INDEX todo_tasks_user_updated_idx ON public.todo_tasks (user_id, updated_at);