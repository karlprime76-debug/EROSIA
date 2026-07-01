-- Erosia Consolidated Final Migration (safe à ré-exécuter — tout IF NOT EXISTS / OR REPLACE)
-- À copier-coller dans Supabase SQL Editor et exécuter une seule fois

-- =============================================================================
-- PARTIE 1: v16 — profile_visible column
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_profiles_profile_visible ON profiles(profile_visible) WHERE profile_visible = true;

-- =============================================================================
-- PARTIE 2: v15 — Colonnes, tables et RPCs manquants
-- =============================================================================

-- 2a. onboarding_complete
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;

-- 2b. user_scores
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
CREATE POLICY "Users can view own user_scores" ON user_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
CREATE POLICY "Everyone can view user_scores" ON user_scores FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Service role can manage user_scores" ON user_scores;
CREATE POLICY "Service role can manage user_scores" ON user_scores FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_user_scores_user ON user_scores(user_id);

-- 2c. quiz_questions + seed
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view quiz_questions" ON quiz_questions;
CREATE POLICY "Everyone can view quiz_questions" ON quiz_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Service role can manage quiz_questions" ON quiz_questions FOR ALL USING (auth.role() = 'service_role');

INSERT INTO quiz_questions (question, options, category) VALUES
  ('Quel est ton style de week-end idéal ?', '[{"text":"Aventure en plein air","trait":"aventurier"},{"text":"Chill à la maison","trait":"casual"},{"text":"Sortie entre amis","trait":"social"},{"text":"Culture et découvertes","trait":"curieux"}]', 'lifestyle'),
  ('Quel est ton plus grand défaut ?', '[{"text":"Trop ambitieux·se","trait":"ambitieux"},{"text":"Trop sensible","trait":"sensible"},{"text":"Trop impatient·e","trait":"spontané"},{"text":"Trop perfectionniste","trait":"exigeant"}]', 'personnalité'),
  ('Quel genre de voyage préfères-tu ?', '[{"text":"Road trip","trait":"aventurier"},{"text":"Ville culturelle","trait":"curieux"},{"text":"Plage et farniente","trait":"casual"},{"text":"Randonnée nature","trait":"aventurier"}]', 'voyage'),
  ('Comment réagis-tu face à un imprévu ?', '[{"text":"Je m''adapte facilement","trait":"flexible"},{"text":"Je planifie une solution","trait":"organisé"},{"text":"Je suis stressé·e","trait":"sensible"},{"text":"J''en profite pour improviser","trait":"spontané"}]', 'personnalité'),
  ('Quel est ton langage d''amour principal ?', '[{"text":"Les paroles valorisantes","trait":"romantique"},{"text":"Les moments de qualité","trait":"attentif"},{"text":"Les cadeaux","trait":"généreux"},{"text":"Le contact physique","trait":"passionné"}]', 'relation')
ON CONFLICT DO NOTHING;

-- 2d. quiz_answers
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
CREATE POLICY "Users can view own quiz answers" ON quiz_answers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
CREATE POLICY "Everyone can view quiz answers" ON quiz_answers FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own quiz answers" ON quiz_answers;
CREATE POLICY "Users can insert own quiz answers" ON quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own quiz answers" ON quiz_answers;
CREATE POLICY "Users can update own quiz answers" ON quiz_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON quiz_answers(user_id);

-- 2e. get_user_top_traits RPC
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

-- 2f. streaks table + trigger
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
CREATE POLICY "Users can view own streak" ON streaks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own streak" ON streaks;
CREATE POLICY "Users can insert own streak" ON streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own streak" ON streaks;
CREATE POLICY "Users can update own streak" ON streaks FOR UPDATE USING (auth.uid() = user_id);

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

-- 2g. aura_snapshots
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
CREATE POLICY "All authenticated can view aura_snapshots" ON aura_snapshots FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own aura" ON aura_snapshots;
CREATE POLICY "Users can insert own aura" ON aura_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own aura" ON aura_snapshots;
CREATE POLICY "Users can update own aura" ON aura_snapshots FOR UPDATE USING (auth.uid() = user_id);

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

-- =============================================================================
-- PARTIE 3: v16 — privacy_settings table + triggers
-- =============================================================================
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visible BOOLEAN NOT NULL DEFAULT true,
  visible_to_compatible_only BOOLEAN NOT NULL DEFAULT false,
  hide_exact_age BOOLEAN NOT NULL DEFAULT false,
  hide_exact_distance BOOLEAN NOT NULL DEFAULT false,
  blur_photos BOOLEAN NOT NULL DEFAULT false,
  first_message_permission TEXT NOT NULL DEFAULT 'everyone'
    CHECK (first_message_permission IN ('everyone','matches','verified_only','nobody')),
  story_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (story_visibility IN ('everyone','matches','nobody')),
  online_status_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (online_status_visibility IN ('everyone','matches','nobody')),
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  auto_block_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can view own privacy_settings" ON privacy_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can insert own privacy_settings" ON privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can update own privacy_settings" ON privacy_settings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated can SELECT privacy_settings for checks" ON privacy_settings;
CREATE POLICY "Authenticated can SELECT privacy_settings for checks" ON privacy_settings FOR SELECT USING (auth.role() = 'authenticated');

-- Auto-create privacy_settings on profile creation
CREATE OR REPLACE FUNCTION trigger_create_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_privacy ON profiles;
CREATE TRIGGER on_profile_created_privacy
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_privacy_settings();

-- Sync profile_visible from privacy_settings to profiles
CREATE OR REPLACE FUNCTION sync_profile_visible()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET profile_visible = NEW.profile_visible WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_privacy_update_sync_profile ON privacy_settings;
CREATE TRIGGER on_privacy_update_sync_profile
  AFTER INSERT OR UPDATE OF profile_visible ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_visible();

-- =============================================================================
-- PARTIE 4: v17 — Consent & Safety tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_action ON consent_log(action_type);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

CREATE TABLE IF NOT EXISTS safety_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO safety_tips (category, icon, title, content, priority) VALUES
  ('dating', 'Heart', 'Rencontres dans un lieu public', 'Pour les premiers rendez-vous, privilégie toujours un endroit public et fréquenté. Préviens un ami ou un proche du lieu et de l heure de ton rendez-vous.', 10),
  ('dating', 'User', 'Ne partage pas tes coordonnées trop vite', 'Prends le temps de connaître la personne avant de partager ton numéro de téléphone, ton adresse ou tes réseaux sociaux. Utilise la messagerie Erosia.', 0),
  ('privacy', 'Shield', 'Protège tes photos', 'Évite d envoyer des photos intimes ou compromettantes. Une fois partagées, tu perds le contrôle sur leur diffusion.', 0),
  ('privacy', 'Lock', 'Vérifie tes paramètres de confidentialité', 'Rends-toi régulièrement dans tes paramètres de confidentialité pour vérifier qui peut voir ton profil, ta localisation et ton statut en ligne.', 0),
  ('security', 'Eye', 'Signale les comportements suspects', 'Si quelqu un te met mal à l aise, te demande de l argent ou insiste après un refus, signale-le immédiatement depuis la conversation.', 0),
  ('security', 'Shield', 'Ne réponds pas aux demandes d argent', 'Erosia ne demande jamais d argent en dehors des abonnements Premium officiels. Méfie-toi des demandes de virement, carte cadeau ou aide financière.', 0),
  ('consent', 'Heart', 'Le consentement est essentiel', 'Chaque interaction doit être basée sur un consentement mutuel et enthousiaste. Tu peux retirer ton consentement à tout moment, sans justification.', 0),
  ('consent', 'MessageCircle', 'Communique tes limites', 'Sois clair·e sur tes limites et attentes dès le début. Une personne qui les respecte est une personne de confiance.', 0),
  ('dating', 'Sun', 'Écoute ton intuition', 'Si quelque chose te semble étrange ou trop beau pour être vrai, écoute ton instinct. Tu peux mettre fin à une conversation ou bloquer un utilisateur à tout moment.', 0)
ON CONFLICT DO NOTHING;

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_log_insert ON consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY consent_log_select ON consent_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blocked_users_insert ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY blocked_users_select ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY blocked_users_delete ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY safety_tips_select ON safety_tips FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION is_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2);
$$;

CREATE OR REPLACE FUNCTION get_blocked_ids(blocker_id UUID)
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT blocked_id FROM blocked_users WHERE blocker_id = $1;
$$;

-- =============================================================================
-- PARTIE 5: v18 — Gift catalog seed
-- =============================================================================
INSERT INTO gifts (name, emoji, price_cents, image_url) VALUES
  ('Cœur virtuel', '💜', 150, NULL),
  ('Rose rouge', '🌹', 300, NULL),
  ('Bisou volant', '💋', 200, NULL),
  ('Sticker mignon', '✨', 100, NULL),
  ('Fleur de cerisier', '🌸', 250, NULL),
  ('Cœur qui bat', '💓', 180, NULL),
  ('Petit nuage', '☁️', 120, NULL),
  ('Étoile filante', '⭐', 220, NULL),
  ('Papillon', '🦋', 280, NULL),
  ('Boîte de chocolats', '🍫', 1500, NULL),
  ('Bouquet de fleurs', '💐', 2000, NULL),
  ('Parfum', '🧴', 3500, NULL),
  ('Peluche ours', '🧸', 2500, NULL),
  ('Bague', '💍', 4500, NULL),
  ('Collier', '📿', 3000, NULL),
  ('Montre', '⌚', 4000, NULL),
  ('Livre', '📖', 1500, NULL),
  ('Vin', '🍷', 2200, NULL),
  ('Gâteau', '🎂', 1800, NULL),
  ('Bougies', '🕯️', 800, NULL),
  ('Porte-bonheur', '🍀', 600, NULL),
  ('Masque de beauté', '🧖', 1200, NULL),
  ('Bijoux de cheveux', '💎', 900, NULL),
  ('Sac à main', '👛', 8000, NULL),
  ('Chaussures', '👠', 10000, NULL),
  ('Veste', '🧥', 12000, NULL),
  ('Casque audio', '🎧', 7000, NULL),
  ('Montre connectée', '⌚', 15000, NULL),
  ('Parfum de luxe', '🌺', 9000, NULL),
  ('Coffret cadeau', '🎁', 6000, NULL),
  ('Abonnement Premium', '👑', 5000, NULL),
  ('Dîner aux chandelles', '🕯️', 10000, NULL),
  ('Cinéma à deux', '🎬', 4000, NULL),
  ('Week-end surprise', '🏖️', 25000, NULL),
  ('Spa journée', '💆', 15000, NULL),
  ('Concert', '🎵', 8000, NULL),
  ('Cours de cuisine', '👨‍🍳', 6000, NULL),
  ('Escape game', '🧩', 5000, NULL),
  ('Badge Super Fan', '🏆', 500, NULL),
  ('Cadre photo', '🖼️', 700, NULL),
  ('Carte virtuelle', '💌', 200, NULL),
  ('Super Like', '🔥', 1000, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PARTIE 6: v14 — Rate limiting table + RPC
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role managed" ON rate_limits;
CREATE POLICY "Service role managed" ON rate_limits FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_ms INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_reset_at TIMESTAMPTZ;
  v_count INT;
BEGIN
  DELETE FROM rate_limits WHERE reset_at < v_now;
  SELECT count, reset_at INTO v_count, v_reset_at FROM rate_limits WHERE key = p_key;
  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval);
    RETURN TRUE;
  ELSIF v_now > v_reset_at THEN
    UPDATE rate_limits SET count = 1, reset_at = v_now + (p_window_ms || ' milliseconds')::interval WHERE key = p_key;
    RETURN TRUE;
  ELSIF v_count >= p_max_requests THEN
    RETURN FALSE;
  ELSE
    UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PARTIE 7: Index supplémentaires pour la performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_looking_for ON profiles(looking_for);
CREATE INDEX IF NOT EXISTS idx_profiles_mood ON profiles(mood);
