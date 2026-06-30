-- Erosia Schema v15 — Tables/RPCs manquants (safe à ré-exécuter)
-- Copie-colle dans Supabase SQL Editor → Run

-- ==============================
-- 1. Colonne onboarding_complete
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;

-- ==============================
-- 2. user_scores (engine/compatibility)
-- ==============================
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

CREATE INDEX IF NOT EXISTS idx_user_scores_user ON user_scores(user_id);

-- ==============================
-- 3. quiz_questions + seed data
-- ==============================
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

INSERT INTO quiz_questions (question, options, category) VALUES
  ('Quel est ton style de week-end idéal ?', '[{"text":"Aventure en plein air","trait":"aventurier"},{"text":"Chill à la maison","trait":"casual"},{"text":"Sortie entre amis","trait":"social"},{"text":"Culture et découvertes","trait":"curieux"}]', 'lifestyle'),
  ('Quel est ton plus grand défaut ?', '[{"text":"Trop ambitieux·se","trait":"ambitieux"},{"text":"Trop sensible","trait":"sensible"},{"text":"Trop impatient·e","trait":"spontané"},{"text":"Trop perfectionniste","trait":"exigeant"}]', 'personnalité'),
  ('Quel genre de voyage préfères-tu ?', '[{"text":"Road trip","trait":"aventurier"},{"text":"Ville culturelle","trait":"curieux"},{"text":"Plage et farniente","trait":"casual"},{"text":"Randonnée nature","trait":"aventurier"}]', 'voyage'),
  ('Comment réagis-tu face à un imprévu ?', '[{"text":"Je m''adapte facilement","trait":"flexible"},{"text":"Je planifie une solution","trait":"organisé"},{"text":"Je suis stressé·e","trait":"sensible"},{"text":"J''en profite pour improviser","trait":"spontané"}]', 'personnalité'),
  ('Quel est ton langage d''amour principal ?', '[{"text":"Les paroles valorisantes","trait":"romantique"},{"text":"Les moments de qualité","trait":"attentif"},{"text":"Les cadeaux","trait":"généreux"},{"text":"Le contact physique","trait":"passionné"}]', 'relation')
ON CONFLICT DO NOTHING;

-- ==============================
-- 4. quiz_answers
-- ==============================
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

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON quiz_answers(user_id);

-- ==============================
-- 5. get_user_top_traits RPC
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

-- ==============================
-- 6. streaks table + trigger
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

-- ==============================
-- 7. aura_snapshots (si pas déjà créé)
-- ==============================
CREATE TABLE IF NOT EXISTS aura_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level INT NOT NULL CHECK (level >= 0 AND level <= 100),
  color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  glow_intensity REAL NOT NULL CHECK (glow_intensity >= 0 AND glow_intensity <= 1),
  particle_count INT NOT NULL DEFAULT 20,
  label TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE aura_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view aura_snapshots" ON aura_snapshots;
CREATE POLICY "All authenticated can view aura_snapshots"
  ON aura_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own aura" ON aura_snapshots;
CREATE POLICY "Users can insert own aura"
  ON aura_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own aura" ON aura_snapshots;
CREATE POLICY "Users can update own aura"
  ON aura_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trigger_recompute_aura()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aura_snapshots (user_id, level, color, secondary_color, glow_intensity, particle_count, label, factors, updated_at)
  VALUES (NEW.id, 50, '#6B7280', '#3B82F6', 0.2, 10, 'Brouillard', '{"energy":15,"trust":12,"mood":0,"activity":0,"profile":5}'::jsonb, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_aura ON profiles;
CREATE TRIGGER on_profile_created_aura
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_aura();
