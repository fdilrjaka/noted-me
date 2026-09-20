-- Foto profil dipindah dari user_metadata (base64 di dalam JWT, ikut terkirim di SETIAP request
-- dan di presence realtime) ke bucket Storage. Yang tersimpan di metadata hanya URL-nya.
--
-- Bucket publik: gambar dibaca lewat URL publik (tanpa policy). Menulis/menimpa/menghapus dibatasi
-- ke folder milik user sendiri (<user_id>/...). Jenis file dan ukuran dibatasi di sisi bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 262144, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
