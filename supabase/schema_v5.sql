-- Erosia Schema v5 - Visio-Chat, Quiz Profile, Read Receipts, Ghost Mode, Icebreaker AI, Streaks, Shared Playlist, Daily Profile
-- Run this after schema_v4.sql

-- ==============================
-- 1. Visio-Chat (video calls)
-- ==============================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES profiles(id) NOT NULL,
  callee_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ringing', 'connected', 'ended', 'missed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calls they are part of" ON calls;
CREATE POLICY "Users can view calls they are part of"
  ON calls FOR SELECT
  USING (auth.uid() IN (caller_id, callee_id));

DROP POLICY IF EXISTS "Users can insert calls they are part of" ON calls;
CREATE POLICY "Users can insert calls they are part of"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can update calls they are part of" ON calls;
CREATE POLICY "Users can update calls they are part of"
  ON calls FOR UPDATE
  USING (auth.uid() IN (caller_id, callee_id));

-- ==============================
-- 2. Quiz visible sur le profil
-- ==============================

CREATE OR REPLACE FUNCTION get_user_top_traits(p_user_id UUID)
RETURNS TABLE(trait TEXT, count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT trait_counts.trait, trait_counts.cnt
  FROM (
    SELECT
      (qq.options->qa.answer_index->>'trait')::TEXT AS trait,
      COUNT(*)::INT AS cnt
    FROM quiz_answers qa
    JOIN quiz_questions qq ON qa.question_id = qq.id
    WHERE qa.user_id = p_user_id
      AND qq.options IS NOT NULL
      AND jsonb_typeof(qq.options) = 'array'
      AND qa.answer_index < jsonb_array_length(qq.options)
    GROUP BY (qq.options->qa.answer_index->>'trait')
    ORDER BY cnt DESC
    LIMIT 3
  ) trait_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_profile_quiz_summary(p_user_id UUID)
RETURNS TABLE(question TEXT, answer TEXT, trait TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qq.question,
    (qq.options->qa.answer_index->>'text')::TEXT AS answer,
    (qq.options->qa.answer_index->>'trait')::TEXT AS trait
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qa.question_id = qq.id
  WHERE qa.user_id = p_user_id
    AND qq.options IS NOT NULL
    AND jsonb_typeof(qq.options) = 'array'
    AND qa.answer_index < jsonb_array_length(qq.options)
  ORDER BY qq.category, qq.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 3. Accusés de lecture (read receipts)
-- ==============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION mark_messages_read(p_match_id UUID, p_reader_id UUID)
RETURNS INT4 AS $$
DECLARE
  updated_count INT4;
BEGIN
  UPDATE messages
  SET read_at = now()
  WHERE match_id = p_match_id
    AND sender_id != p_reader_id
    AND read_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  UPDATE matches
  SET read_count = COALESCE(read_count, 0) + updated_count
  WHERE id = p_match_id;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_count(p_match_id UUID, p_user_id UUID)
RETURNS INT4 AS $$
DECLARE
  unread INT4;
BEGIN
  SELECT COUNT(*)::INT4 INTO unread
  FROM messages
  WHERE match_id = p_match_id
    AND sender_id != p_user_id
    AND read_at IS NULL;

  RETURN unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 4. Mode hors ligne / fantôme (ghost mode)
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- ==============================
-- 5. Icebreaker IA
-- ==============================
CREATE TABLE IF NOT EXISTS icebreaker_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  target_id UUID REFERENCES profiles(id) NOT NULL,
  suggestion TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE icebreaker_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can view own icebreaker suggestions"
  ON icebreaker_suggestions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can insert own icebreaker suggestions"
  ON icebreaker_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can update own icebreaker suggestions"
  ON icebreaker_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can delete own icebreaker suggestions"
  ON icebreaker_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION generate_icebreaker(p_user_id UUID, p_target_id UUID)
RETURNS TEXT AS $$
DECLARE
  target_interests TEXT[];
  target_bio TEXT;
  suggestion TEXT;
  template INT;
  interest_count INT;
BEGIN
  SELECT interests, bio INTO target_interests, target_bio
  FROM profiles WHERE id = p_target_id;

  IF target_interests IS NULL OR array_length(target_interests, 1) = 0 THEN
    RETURN 'Qu''est-ce qui t''a donné envie de rejoindre Erosia ?';
  END IF;

  interest_count := array_length(target_interests, 1);
  template := (floor(random() * 5) + 1)::INT;

  CASE template
    WHEN 1 THEN suggestion := 'J''ai vu que tu aimes ' || target_interests[1] || ', c''est génial ! Comment as-tu découvert cette passion ?';
    WHEN 2 THEN suggestion := 'Puisque tu es fan de ' || target_interests[1] || ', quel est ton meilleur souvenir lié à ça ?';
    WHEN 3 THEN suggestion := 'Je vois que tu aimes ' || target_interests[1] || ', c''est aussi un de mes centres d''intérêt ! Qu''est-ce qui te plaît le plus là-dedans ?';
    WHEN 4 THEN suggestion := 'Tu as ' || target_interests[1] || ' dans tes centres d''intérêt ! Si tu devais recommander ça à quelqu''un, par quoi commencerais-tu ?';
    WHEN 5 THEN suggestion := 'Parlons de ' || target_interests[1] || ' ! Quelle est la chose la plus cool que tu aies faite récemment en rapport avec ça ?';
  END CASE;

  INSERT INTO icebreaker_suggestions (user_id, target_id, suggestion)
  VALUES (p_user_id, p_target_id, suggestion);

  RETURN suggestion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 6. Streaks (consecutive days chatting)
-- ==============================
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON streaks;
CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own streak" ON streaks;
CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON streaks;
CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streaks (user_id, current_streak, longest_streak, last_message_date)
  VALUES (NEW.sender_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN streaks.last_message_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
      WHEN streaks.last_message_date = CURRENT_DATE THEN streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      streaks.longest_streak,
      CASE
        WHEN streaks.last_message_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
        WHEN streaks.last_message_date = CURRENT_DATE THEN streaks.current_streak
        ELSE 1
      END
    ),
    last_message_date = CURRENT_DATE,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_streak ON messages;
CREATE TRIGGER on_message_streak
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_streak();

CREATE OR REPLACE FUNCTION check_streaks()
RETURNS INT4 AS $$
DECLARE
  reset_count INT4;
BEGIN
  UPDATE streaks
  SET current_streak = 0
  WHERE last_message_date < CURRENT_DATE - 1
    AND current_streak > 0;

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 7. Playlist partagée (shared playlist)
-- ==============================
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT,
  platform TEXT DEFAULT 'spotify' CHECK (platform IN ('spotify', 'youtube', 'deezer', 'other')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view playlist items in their matches" ON playlist_items;
CREATE POLICY "Users can view playlist items in their matches"
  ON playlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = playlist_items.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert playlist items in their matches" ON playlist_items;
CREATE POLICY "Users can insert playlist items in their matches"
  ON playlist_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = playlist_items.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own playlist items" ON playlist_items;
CREATE POLICY "Users can delete own playlist items"
  ON playlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- 8. Profil du jour (daily featured profile)
-- ==============================
CREATE TABLE IF NOT EXISTS daily_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view daily profiles" ON daily_profiles;
CREATE POLICY "All authenticated users can view daily profiles"
  ON daily_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can insert daily profiles" ON daily_profiles;
CREATE POLICY "Service role can insert daily profiles"
  ON daily_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION select_daily_profile()
RETURNS UUID AS $$
DECLARE
  chosen_id UUID;
  today_date DATE := CURRENT_DATE;
BEGIN
  SELECT profile_id INTO chosen_id
  FROM daily_profiles
  WHERE date = today_date;

  IF found THEN
    RETURN chosen_id;
  END IF;

  SELECT id INTO chosen_id
  FROM profiles
  WHERE incognito = false
    AND ghost_mode = false
  ORDER BY random()
  LIMIT 1;

  INSERT INTO daily_profiles (profile_id, date)
  VALUES (chosen_id, today_date);

  RETURN chosen_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
