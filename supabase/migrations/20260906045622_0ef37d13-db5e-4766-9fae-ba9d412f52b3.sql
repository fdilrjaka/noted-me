CREATE TABLE public.schedule_classes (
  id uuid NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day text NOT NULL DEFAULT 'senin',
  course_name text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  class_type text NOT NULL DEFAULT 'online',
  status text NOT NULL DEFAULT 'upcoming',
  lms_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  deadline text,
  position double precision NOT NULL DEFAULT 0,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_classes TO authenticated;
GRANT ALL ON public.schedule_classes TO service_role;
ALTER TABLE public.schedule_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedule classes" ON public.schedule_classes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_classes;