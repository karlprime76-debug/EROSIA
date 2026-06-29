-- Erosia Schema v13 - Audit Fixes: missing tables, columns, indexes, FKs, RPCs, triggers, RLS
-- Run this LAST, after schema_v12_social_rooms.sql
-- All statements use IF [NOT] EXISTS so it's safe to run multiple times

-- ==============================
-- 1. MISSING TABLES
-- ==============================

-- 1a. behavior_log (used by engine/behavior.ts, engine/activity.ts, api/engine/behavior)
CREATE TABLE IF NOT EXISTS behavior_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE behavior_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own behavior_log" ON behavior_log;
CREATE POLICY "Users can view own behavior_log"
  ON behavior_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own behavior_log" ON behavior_log;
CREATE POLICY "Users can insert own behavior_log"
  ON behavior_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1b. push_subscriptions (used by api.ts, api/push/send, api/auth/delete-account)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- 1c. quiz_questions (used by api.ts, engine/compatibility.ts RPC)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view quiz_questions" ON quiz_questions;
CREATE POLICY "Everyone can view quiz_questions"
  ON quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Service role can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (auth.role() = 'service_role');

-- Seed quiz questions
INSERT INTO quiz_questions (question, options, category) VALUES
  ('Quel est ton style de week-end idéal ?', '[{"text":"Aventure en plein air","trait":"aventurier"},{"text":"Chill à la maison","trait":"casual"},{"text":"Sortie entre amis","trait":"social"},{"text":"Culture et découvertes","trait":"curieux"}]', 'lifestyle'),
  ('Quel est ton plus grand défaut ?', '[{"text":"Trop ambitieux·se","trait":"ambitieux"},{"text":"Trop sensible","trait":"sensible"},{"text":"Trop impatient·e","trait":"spontané"},{"text":"Trop perfectionniste","trait":"exigeant"}]', 'personnalité'),
  ('Quel genre de voyage préfères-tu ?', '[{"text":"Road trip","trait":"aventurier"},{"text":"Ville culturelle","trait":"curieux"},{"text":"Plage et farniente","trait":"casual"},{"text":"Randonnée nature","trait":"aventurier"}]', 'voyage'),
  ('Comment réagis-tu face à un imprévu ?', '[{"text":"Je m''adapte facilement","trait":"flexible"},{"text":"Je planifie une solution","trait":"organisé"},{"text":"Je suis stressé·e","trait":"sensible"},{"text":"J''en profite pour improviser","trait":"spontané"}]', 'personnalité'),
  ('Quel est ton langage d''amour principal ?', '[{"text":"Les paroles valorisantes","trait":"romantique"},{"text":"Les moments de qualité","trait":"attentif"},{"text":"Les cadeaux","trait":"généreux"},{"text":"Le contact physique","trait":"passionné"}]', 'relation')
ON CONFLICT DO NOTHING;

-- 1d. quiz_answers (used by api.ts, engine/compatibility.ts RPC)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
CREATE POLICY "Users can view own quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
CREATE POLICY "Everyone can view quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own quiz answers" ON quiz_answers;
CREATE POLICY "Users can insert own quiz answers"
  ON quiz_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quiz answers" ON quiz_answers;
CREATE POLICY "Users can update own quiz answers"
  ON quiz_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- 1e. user_scores (used by engine/compatibility.ts)
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  activity_score REAL DEFAULT 0.5,
  trust_score REAL DEFAULT 0.5,
  energy_score REAL DEFAULT 0.5,
  compatibility_score REAL DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_scores" ON user_scores;
CREATE POLICY "Users can view own user_scores"
  ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
CREATE POLICY "Everyone can view user_scores"
  ON user_scores FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage user_scores" ON user_scores;
CREATE POLICY "Service role can manage user_scores"
  ON user_scores FOR ALL
  USING (auth.role() = 'service_role');

-- 1f. interest_graph (used by engine/interest-graph.ts)
CREATE TABLE IF NOT EXISTS interest_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interest_graph ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view interest_graph" ON interest_graph;
CREATE POLICY "Everyone can view interest_graph"
  ON interest_graph FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage interest_graph" ON interest_graph;
CREATE POLICY "Service role can manage interest_graph"
  ON interest_graph FOR ALL
  USING (auth.role() = 'service_role');

-- 1g. profile_interests (used by engine/interest-graph.ts)
CREATE TABLE IF NOT EXISTS profile_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES interest_graph(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, interest_id)
);

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view profile_interests" ON profile_interests;
CREATE POLICY "Everyone can view profile_interests"
  ON profile_interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own profile_interests" ON profile_interests;
CREATE POLICY "Users can manage own profile_interests"
  ON profile_interests FOR ALL
  USING (auth.uid() = profile_id);

-- ==============================
-- 2. MISSING COLUMNS
-- ==============================

-- 2a. sent_gifts columns (needed for payment tracking)
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS amount_paid INT;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS fee_cents INT DEFAULT 0;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- 2b. moderation_queue status column
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- 2c. notifications type: add 'gift'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('match', 'flirt', 'message', 'super_like', 'verification', 'gift'));

-- ==============================
-- 3. MISSING INDEXES
-- ==============================

-- Performance-critical indexes on queried columns
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON swipes(swiper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON swipes(swiped_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_behavior_log_user ON behavior_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_action ON behavior_log(action);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON quiz_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_user ON user_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender ON sent_gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_receiver ON sent_gifts(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flirts_receiver ON flirts(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- ==============================
-- 4. MISSING CASCADE DELETES ON FKs
-- ==============================

-- Drop and recreate FK constraints to add ON DELETE CASCADE
-- This prevents orphaned rows when a profile is deleted

DO $$ BEGIN
  -- swipes
  ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_fkey;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_id_fkey FOREIGN KEY (swiper_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiped_id_fkey;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiped_id_fkey FOREIGN KEY (swiped_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user1_id_fkey;
  ALTER TABLE matches ADD CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user2_id_fkey;
  ALTER TABLE matches ADD CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
  ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE flirts DROP CONSTRAINT IF EXISTS flirts_sender_id_fkey;
  ALTER TABLE flirts ADD CONSTRAINT flirts_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE flirts DROP CONSTRAINT IF EXISTS flirts_receiver_id_fkey;
  ALTER TABLE flirts ADD CONSTRAINT flirts_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
  ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
  ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
  ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;
  ALTER TABLE reports ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================
-- 5. MISSING RPC: get_compatibility
-- ==============================

DROP FUNCTION IF EXISTS get_compatibility(uuid,uuid);
CREATE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS REAL AS $$
DECLARE
  score REAL;
  age_factor REAL;
  distance_factor REAL;
  interest_factor REAL;
  looking_factor REAL;
  user_a RECORD;
  user_b RECORD;
  lat1 DOUBLE PRECISION;
  lng1 DOUBLE PRECISION;
  lat2 DOUBLE PRECISION;
  lng2 DOUBLE PRECISION;
  dist DOUBLE PRECISION;
  user_interests TEXT[];
  target_interests TEXT[];
  shared_count INT;
  union_count INT;
BEGIN
  SELECT age, latitude, longitude, looking_for, interests INTO user_a
  FROM profiles WHERE id = user_a_id;
  SELECT age, latitude, longitude, looking_for, interests INTO user_b
  FROM profiles WHERE id = user_b_id;

  IF user_a.id IS NULL OR user_b.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Age factor (15%)
  IF user_a.age IS NOT NULL AND user_b.age IS NOT NULL THEN
    age_factor := GREATEST(0, 1 - ABS(user_a.age - user_b.age) / 50.0);
  ELSE
    age_factor := 0.5;
  END IF;

  -- Distance factor (20%)
  lat1 := user_a.latitude; lng1 := user_a.longitude;
  lat2 := user_b.latitude; lng2 := user_b.longitude;
  IF lat1 IS NOT NULL AND lng1 IS NOT NULL AND lat2 IS NOT NULL AND lng2 IS NOT NULL THEN
    dist := 6371 * 2 * ASIN(LEAST(1, SQRT(
      SIN((lat2 - lat1) * PI() / 360)^2 +
      COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
      SIN((lng2 - lng1) * PI() / 360)^2
    )));
    distance_factor := GREATEST(0, 1 - LEAST(dist, 500) / 500.0);
  ELSE
    distance_factor := 0.5;
  END IF;

  -- Interest factor (25%)
  user_interests := COALESCE(user_a.interests, '{}');
  target_interests := COALESCE(user_b.interests, '{}');
  IF array_length(user_interests, 1) > 0 AND array_length(target_interests, 1) > 0 THEN
    SELECT COUNT(*) INTO shared_count
    FROM (
      SELECT unnest(user_interests)
      INTERSECT
      SELECT unnest(target_interests)
    ) s;
    SELECT COUNT(DISTINCT u) INTO union_count
    FROM (
      SELECT unnest(user_interests) AS u
      UNION
      SELECT unnest(target_interests)
    ) s;
    interest_factor := CASE WHEN union_count > 0 THEN shared_count::REAL / union_count ELSE 0 END;
  ELSE
    interest_factor := 0.5;
  END IF;

  -- Looking for factor (15%)
  IF user_a.looking_for IS NOT NULL AND user_b.looking_for IS NOT NULL THEN
    IF user_a.looking_for = user_b.looking_for THEN
      looking_factor := 1.0;
    ELSE
      looking_factor := 0.5;
    END IF;
  ELSE
    looking_factor := 0.5;
  END IF;

  -- Composite: weights = age:15%, distance:20%, interests:25%, looking:15%, language:5%, personality:15%, activity:5%
  score := age_factor * 0.15 + distance_factor * 0.20 + interest_factor * 0.25 + looking_factor * 0.15 + 0.05;

  RETURN ROUND(score::REAL, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 6. MISSING FUNCTION & TRIGGER: update_last_seen
-- ==============================

CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_seen = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_active ON auth.users;
CREATE TRIGGER on_auth_user_active
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- ==============================
-- 7. MISSING RLS POLICIES
--    (all guarded by table existence checks)
-- ==============================

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'duels' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Creators can update own duels" ON duels;
    CREATE POLICY "Creators can update own duels"
      ON duels FOR UPDATE
      USING (auth.uid() = creator_id);

    DROP POLICY IF EXISTS "Creators can delete own duels" ON duels;
    CREATE POLICY "Creators can delete own duels"
      ON duels FOR DELETE
      USING (auth.uid() = creator_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'duel_votes' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can update own duel votes" ON duel_votes;
    CREATE POLICY "Users can update own duel votes"
      ON duel_votes FOR UPDATE
      USING (auth.uid() = voter_id);

    DROP POLICY IF EXISTS "Users can delete own duel votes" ON duel_votes;
    CREATE POLICY "Users can delete own duel votes"
      ON duel_votes FOR DELETE
      USING (auth.uid() = voter_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'calls' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can delete own calls" ON calls;
    CREATE POLICY "Users can delete own calls"
      ON calls FOR DELETE
      USING (auth.uid() IN (caller_id, callee_id));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'playlist_items' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can update own playlist items" ON playlist_items;
    CREATE POLICY "Users can update own playlist items"
      ON playlist_items FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'streaks' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can delete own streak" ON streaks;
    CREATE POLICY "Users can delete own streak"
      ON streaks FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'daily_profiles' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Service role can update daily_profiles" ON daily_profiles;
    CREATE POLICY "Service role can update daily_profiles"
      ON daily_profiles FOR UPDATE
      USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role can delete daily_profiles" ON daily_profiles;
    CREATE POLICY "Service role can delete daily_profiles"
      ON daily_profiles FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'gift_transactions' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Service role can update gift_transactions" ON gift_transactions;
    CREATE POLICY "Service role can update gift_transactions"
      ON gift_transactions FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==============================
-- 8. ENABLE REALTIME FOR KEY TABLES
-- ==============================

-- Guarded by table existence checks to avoid 42P01
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'room_presence' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE room_presence;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'space_presence' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE space_presence;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================
-- 9. STORAGE BUCKETS (ensure all exist)
-- ==============================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('photos', 'photos', true),
  ('stories', 'stories', true),
  ('profile_videos', 'profile_videos', true),
  ('chat_photos', 'chat_photos', true),
  ('chat_audio', 'chat_audio', true),
  ('verification_photos', 'verification_photos', true),
  ('event_images', 'event_images', true)
ON CONFLICT (id) DO NOTHING;
