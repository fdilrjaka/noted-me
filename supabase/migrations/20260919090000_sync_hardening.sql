-- Sync hardening.
-- 1) server_updated_at: kursor pull berbasis jam server (bukan jam perangkat) + index-nya.
-- 2) Daftarkan semua tabel sync ke publication realtime (sebelumnya hanya schedule_classes).
-- 3) Pastikan bucket storage "note-images" ada (sebelumnya hanya policy-nya yang dibuat).
-- Semua langkah idempoten, aman dijalankan ulang / di project yang sebagian sudah disetel lewat dashboard.

-- 1) Jam server ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_server_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- clock_timestamp() (bukan now()) supaya baris dalam satu transaksi tetap berurutan.
  NEW.server_updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subjects', 'pages', 'note_images', 'todo_sections', 'todo_tasks', 'schedule_classes'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp()',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS set_server_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_server_updated_at BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at()',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id, server_updated_at)',
      t || '_user_server_updated_idx',
      t
    );
  END LOOP;
END $$;

-- 2) Realtime -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subjects', 'pages', 'note_images', 'todo_sections', 'todo_tasks', 'schedule_classes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 3) Bucket gambar (privat; akses dibatasi policy per-folder user di migrasi sebelumnya) ---
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', false)
ON CONFLICT (id) DO NOTHING;
