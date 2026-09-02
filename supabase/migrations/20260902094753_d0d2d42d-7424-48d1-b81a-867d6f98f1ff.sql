CREATE TABLE public.note_images (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  page_id uuid NOT NULL,
  storage_path text,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_images TO authenticated;
GRANT ALL ON public.note_images TO service_role;
ALTER TABLE public.note_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own note images" ON public.note_images FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX note_images_page_idx ON public.note_images (user_id, page_id);