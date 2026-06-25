-- Erosia Schema v2 - New Features
-- Run this after schema.sql

-- ==============================
-- Part 1: Profiles new columns
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude float8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude float8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_remaining int4 DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_reset_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito boolean DEFAULT false;

-- ==============================
-- Part 2: Push subscriptions
-- ==============================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- Part 3: Quiz
-- ==============================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{text, trait}]
  category TEXT
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  answer_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view quiz questions"
  ON quiz_questions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own quiz answers"
  ON quiz_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz answers"
  ON quiz_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

-- ==============================
-- Part 4: Super likes daily reset
-- ==============================
CREATE OR REPLACE FUNCTION reset_super_likes()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET super_likes_remaining = 1,
      super_likes_reset_at = now()
  WHERE super_likes_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- Part 5: Compatibility function
-- ==============================
-- Returns a score 0-100 based on interests (50%) and quiz answers (50%)
CREATE OR REPLACE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS float8 AS $$
DECLARE
  shared_interests_count INT;
  total_interests_a INT;
  total_interests_b INT;
  interest_score float8;
  matching_answers INT;
  total_questions INT;
  quiz_score float8;
BEGIN
  -- Interests match (50%)
  SELECT coalesce(array_length(interests, 1), 0) INTO total_interests_a FROM profiles WHERE id = user_a_id;
  SELECT coalesce(array_length(interests, 1), 0) INTO total_interests_b FROM profiles WHERE id = user_b_id;

  IF total_interests_a > 0 AND total_interests_b > 0 THEN
    SELECT COUNT(*) INTO shared_interests_count
    FROM (
      SELECT unnest((SELECT interests FROM profiles WHERE id = user_a_id))
      INTERSECT
      SELECT unnest((SELECT interests FROM profiles WHERE id = user_b_id))
    ) AS shared;
    interest_score := (shared_interests_count::float8 / GREATEST(total_interests_a, total_interests_b)::float8) * 100;
  ELSE
    interest_score := 0;
  END IF;

  -- Quiz match (50%)
  SELECT COUNT(*) INTO matching_answers
  FROM quiz_answers qa1
  JOIN quiz_answers qa2 ON qa1.question_id = qa2.question_id AND qa1.answer_index = qa2.answer_index
  WHERE qa1.user_id = user_a_id AND qa2.user_id = user_b_id;

  SELECT COUNT(*) INTO total_questions
  FROM quiz_answers qa1
  JOIN quiz_answers qa2 ON qa1.question_id = qa2.question_id
  WHERE qa1.user_id = user_a_id AND qa2.user_id = user_b_id;

  IF total_questions > 0 THEN
    quiz_score := (matching_answers::float8 / total_questions::float8) * 100;
  ELSE
    quiz_score := 0;
  END IF;

  RETURN ROUND((interest_score * 0.5 + quiz_score * 0.5)::numeric, 0)::float8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
