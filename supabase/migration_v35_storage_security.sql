-- Migration v35 — Storage & RLS security fixes

-- 1. verification_photos: restrict read/write to owner only
DROP POLICY IF EXISTS "Anyone can view verification_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification photos" ON storage.objects;

CREATE POLICY "Users can view own verification photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own verification photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. quiz_answers: restrict to own answers
DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
CREATE POLICY "Users can view own quiz answers" ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

-- 3. user_scores: restrict to own scores
DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
DROP POLICY IF EXISTS "Users can view own scores" ON user_scores;
CREATE POLICY "Users can view own scores" ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

-- 4. profile_interests: keep public read (needed by compatibility engine)
-- RLS already allows SELECT for all authenticated users via "Everyone can view profile_interests"

-- 5. Add GIN index for interested_in array queries
CREATE INDEX IF NOT EXISTS idx_profiles_interested_in ON profiles USING GIN (interested_in);
