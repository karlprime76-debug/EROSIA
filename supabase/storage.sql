-- Storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to photos
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Allow authenticated users to upload their own photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND auth.uid() = owner
  );

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.uid() = owner
  );

-- Chat photos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_photos', 'chat_photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Chat photos are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat_photos');

CREATE POLICY "Users can upload chat photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat_photos' AND auth.role() = 'authenticated');
