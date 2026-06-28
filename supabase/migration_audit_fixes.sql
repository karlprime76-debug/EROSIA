-- ============================================================
-- Audit fixes migration
-- Tables manquantes, RLS, RPC, index
-- ============================================================

-- 1. push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- 2. quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view quiz questions"
  ON quiz_questions FOR SELECT
  USING (true);

-- 3. quiz_answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quiz answers"
  ON quiz_answers FOR ALL
  USING (auth.uid() = user_id);

-- 4. RPC get_compatibility
CREATE OR REPLACE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  shared_interests INT;
  total_interests_a INT;
  total_interests_b INT;
  score NUMERIC;
BEGIN
  SELECT COUNT(*) INTO shared_interests
  FROM (
    SELECT unnest(interests) FROM profiles WHERE id = user_a_id
    INTERSECT
    SELECT unnest(interests) FROM profiles WHERE id = user_b_id
  ) i;

  SELECT array_length(interests, 1) INTO total_interests_a FROM profiles WHERE id = user_a_id;
  SELECT array_length(interests, 1) INTO total_interests_b FROM profiles WHERE id = user_b_id;

  IF total_interests_a IS NULL OR total_interests_a = 0 OR total_interests_b IS NULL OR total_interests_b = 0 THEN
    RETURN 50;
  END IF;

  score := (shared_interests::NUMERIC / GREATEST(total_interests_a, total_interests_b)) * 100;
  RETURN GREATEST(0, LEAST(100, score));
END;
$$;

-- 5. RLS matches — DELETE + UPDATE
CREATE POLICY "Users can delete own matches"
  ON matches FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own matches"
  ON matches FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 6. RLS messages — DELETE
CREATE POLICY "Users can delete messages in own matches"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- 7. Index manquants
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flirts_receiver ON flirts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender ON sent_gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_receiver ON sent_gifts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_lookup ON swipes(swiped_id, swiper_id);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);

-- 8. updated_at sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- 9. Storage policies manquantes (chat_audio, verification_photos)
DROP POLICY IF EXISTS "Users can update own chat audio" ON storage.objects;
CREATE POLICY "Users can update own chat audio"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own chat audio" ON storage.objects;
CREATE POLICY "Users can delete own chat audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update own verification photos" ON storage.objects;
CREATE POLICY "Users can update own verification photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'verification_photos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own verification photos" ON storage.objects;
CREATE POLICY "Users can delete own verification photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'verification_photos' AND auth.uid() = owner);

-- 10. RLS sent_gifts UPDATE/DELETE
CREATE POLICY "Users can update sent_gifts as receiver"
  ON sent_gifts FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete own sent_gifts"
  ON sent_gifts FOR DELETE
  USING (auth.uid() = sender_id);

-- 11. Auto-update updated_at on user_scores et gift_transactions
DROP TRIGGER IF EXISTS trg_user_scores_updated_at ON user_scores;
CREATE TRIGGER trg_user_scores_updated_at
  BEFORE UPDATE ON user_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

DROP TRIGGER IF EXISTS trg_gift_transactions_updated_at ON gift_transactions;
CREATE TRIGGER trg_gift_transactions_updated_at
  BEFORE UPDATE ON gift_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();
