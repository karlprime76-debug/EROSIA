-- ============================================
-- Erosia — Everything that needs to be added
-- Safe to run even if some already exist
-- ============================================

-- 1. New columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude float8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude float8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_remaining int4 DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_reset_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paydunya_invoice_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 2. Push subscriptions table
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own push subscriptions') THEN
    CREATE POLICY "Users can insert own push subscriptions"
      ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own push subscriptions') THEN
    CREATE POLICY "Users can select own push subscriptions"
      ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own push subscriptions') THEN
    CREATE POLICY "Users can delete own push subscriptions"
      ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Quiz tables
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view quiz questions') THEN
    CREATE POLICY "Everyone can view quiz questions" ON quiz_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own quiz answers') THEN
    CREATE POLICY "Users can insert own quiz answers" ON quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own quiz answers') THEN
    CREATE POLICY "Users can update own quiz answers" ON quiz_answers FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own quiz answers') THEN
    CREATE POLICY "Users can select own quiz answers" ON quiz_answers FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Super likes reset function
CREATE OR REPLACE FUNCTION reset_super_likes()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET super_likes_remaining = 1,
      super_likes_reset_at = now()
  WHERE super_likes_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Compatibility function
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

-- 6. Seed quiz questions (idempotent — won't re-insert)
INSERT INTO quiz_questions (question, options, category)
SELECT 'Quel type de relation recherchez-vous principalement ?', '[{"text": "Une relation sérieuse et durable", "trait": "serious"}, {"text": "Une aventure sans lendemain", "trait": "casual"}, {"text": "Je découvre selon les personnes", "trait": "open"}, {"text": "Une amitié qui pourrait évoluer", "trait": "friendship"}]', 'Relation'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Quel type de relation recherchez-vous principalement ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Comment décririez-vous votre façon de communiquer ?', '[{"text": "Directe et honnête", "trait": "direct"}, {"text": "Douce et attentionnée", "trait": "gentle"}, {"text": "J''écoute beaucoup", "trait": "listener"}, {"text": "J''ai besoin de temps", "trait": "reserved"}]', 'Communication'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Comment décririez-vous votre façon de communiquer ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Quel est votre langage de l''amour principal ?', '[{"text": "Les paroles valorisantes", "trait": "words"}, {"text": "Le contact physique", "trait": "touch"}, {"text": "Les moments de qualité", "trait": "time"}, {"text": "Les attentions et cadeaux", "trait": "gifts"}]', 'Amour'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Quel est votre langage de l''amour principal ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Que faites-vous un samedi soir idéal ?', '[{"text": "Restaurant puis balade en ville", "trait": "social"}, {"text": "Film/série au chaud à deux", "trait": "cozy"}, {"text": "Soirée entre amis", "trait": "party"}, {"text": "Activité originale ou culturelle", "trait": "adventurous"}]', 'Style de vie'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Que faites-vous un samedi soir idéal ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'À quelle fréquence aimez-vous sortir ?', '[{"text": "Presque tous les jours", "trait": "very_social"}, {"text": "Quelques fois par semaine", "trait": "moderate"}, {"text": "Le week-end seulement", "trait": "weekend"}, {"text": "Rarement, je préfère le calme", "trait": "homebody"}]', 'Style de vie'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'À quelle fréquence aimez-vous sortir ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Quel est votre rapport à l''engagement ?', '[{"text": "Je sais ce que je veux et je m''investis", "trait": "committed"}, {"text": "J''ai besoin de temps pour être sûr(e)", "trait": "cautious"}, {"text": "Je préfère rester libre", "trait": "free"}, {"text": "Ça dépend de la personne", "trait": "flexible"}]', 'Relation'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Quel est votre rapport à l''engagement ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Quel trait de caractère admirez-vous le plus ?', '[{"text": "L''humour et la légèreté", "trait": "humor"}, {"text": "La bienveillance et l''écoute", "trait": "kindness"}, {"text": "L''ambition et la détermination", "trait": "ambition"}, {"text": "La spontanéité et l''aventure", "trait": "spontaneous"}]', 'Personnalité'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Quel trait de caractère admirez-vous le plus ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Comment gérez-vous les conflits ?', '[{"text": "J''en parle immédiatement", "trait": "confront"}, {"text": "J''ai besoin de réfléchir d''abord", "trait": "reflect"}, {"text": "Je cherche un compromis", "trait": "compromise"}, {"text": "J''évite les conflits", "trait": "avoid"}]', 'Communication'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Comment gérez-vous les conflits ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'À quel point êtes-vous démonstratif(ve) ?', '[{"text": "Très démonstratif(ve), je montre mon affection", "trait": "very_affectionate"}, {"text": "Plutôt démonstratif(ve)", "trait": "affectionate"}, {"text": "Modéré(e), j''y vais doucement", "trait": "moderate_affection"}, {"text": "Plutôt réservé(e)", "trait": "reserved_affection"}]', 'Amour'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'À quel point êtes-vous démonstratif(ve) ?');

INSERT INTO quiz_questions (question, options, category)
SELECT 'Quel genre d''avenir imaginez-vous ?', '[{"text": "Un mariage et des enfants", "trait": "family"}, {"text": "Voyager et découvrir le monde", "trait": "travel"}, {"text": "Construire quelque chose ensemble", "trait": "build"}, {"text": "Vivre l''instant présent", "trait": "present"}]', 'Relation'
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE question = 'Quel genre d''avenir imaginez-vous ?');
