CREATE POLICY "note-images own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "note-images own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "note-images own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "note-images own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);