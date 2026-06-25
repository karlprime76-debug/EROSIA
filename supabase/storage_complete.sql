-- Storage buckets + policies (photos, stories, chat, verification, video)

-- 1. Photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() = owner);

-- 2. Stories
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read stories" ON storage.objects;
CREATE POLICY "Public read stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "Auth upload stories" ON storage.objects;
CREATE POLICY "Auth upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users delete own stories" ON storage.objects;
CREATE POLICY "Users delete own stories" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid() = owner);

-- 3. Profile videos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_videos', 'profile_videos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
CREATE POLICY "Public read videos" ON storage.objects FOR SELECT USING (bucket_id = 'profile_videos');
DROP POLICY IF EXISTS "Auth upload videos" ON storage.objects;
CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile_videos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users delete own videos" ON storage.objects;
CREATE POLICY "Users delete own videos" ON storage.objects FOR DELETE USING (bucket_id = 'profile_videos' AND auth.uid() = owner);

-- 4. Chat photos
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_photos', 'chat_photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Chat photos public read" ON storage.objects;
CREATE POLICY "Chat photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat_photos');
DROP POLICY IF EXISTS "Auth upload chat photos" ON storage.objects;
CREATE POLICY "Auth upload chat photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_photos' AND auth.role() = 'authenticated');

-- 5. Chat audio
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_audio', 'chat_audio', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read audio" ON storage.objects;
CREATE POLICY "Public read audio" ON storage.objects FOR SELECT USING (bucket_id = 'chat_audio');
DROP POLICY IF EXISTS "Auth upload audio" ON storage.objects;
CREATE POLICY "Auth upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_audio' AND auth.role() = 'authenticated');

-- 6. Verification photos
INSERT INTO storage.buckets (id, name, public) VALUES ('verification_photos', 'verification_photos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read verification" ON storage.objects;
CREATE POLICY "Public read verification" ON storage.objects FOR SELECT USING (bucket_id = 'verification_photos');
DROP POLICY IF EXISTS "Auth upload verification" ON storage.objects;
CREATE POLICY "Auth upload verification" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification_photos' AND auth.role() = 'authenticated');
