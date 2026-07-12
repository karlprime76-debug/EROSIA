-- Migration v47: Premium, Moderation, Monitoring, Maintenance
-- 🔴 = critique | 🟡 = important | 🟢 = polish

-- ============================================================
-- 1. 🔴 Premium subscriptions table (remplace subscription_prices)
-- ============================================================
CREATE TABLE IF NOT EXISTS premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cfa INTEGER NOT NULL,
  price_cfa_yearly INTEGER,
  stripe_price_id TEXT,
  features JSONB NOT NULL DEFAULT '[]',
  badge TEXT,
  popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE premium_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "premium_plans_select_all" ON premium_plans FOR SELECT USING (true);

INSERT INTO premium_plans (name, slug, description, price_cfa, price_cfa_yearly, features, badge, popular, sort_order) VALUES
  ('Gratuit', 'free', 'Pour découvrir Erosia', 0, NULL, '["20 swipes par jour", "Profils de base", "Chat avec tes matchs", "Stories", "1 super like par jour"]', NULL, false, 0),
  ('Premium Mensuel', 'premium_monthly', 'L''expérience complète', 5000, NULL, '["Swipes illimités", "Ghost Mode", "Mode Voyage", "Voir qui t''a liké", "Filtres avancés", "Badge Premium", "Retour sur profil ignoré", "Boost de visibilité", "Statistiques avancées", "Nombre illimité de likes"]', 'Populaire', true, 1),
  ('Premium Annuel', 'premium_yearly', 'Le meilleur rapport qualité-prix', 50000, 50000, '["Tous les avantages Premium", "Économise 10 000 F CFA", "Badge Premium exclusif", "Assistance prioritaire", "Priorité dans les résultats"]', 'Économisez 17%', false, 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. 🟢 Profile completion score column
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completion INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 3. 🔴 Enhanced moderation tables
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'spam', 'insulte', 'harcelement', 'faux_profil',
    'contenu_inapproprie', 'compte_multiple', 'demande_argent',
    'usurpation_identite', 'contenu_violent', 'autre'
  )),
  description TEXT,
  content_type TEXT CHECK (content_type IN ('profile', 'message', 'story', 'event', 'comment')),
  content_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_reports_insert" ON moderation_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "moderation_reports_select_admin" ON moderation_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "moderation_reports_update_admin" ON moderation_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports (status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_category ON moderation_reports (category);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reported ON moderation_reports (reported_id);

-- Warnings system
CREATE TABLE IF NOT EXISTS moderation_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'suspension', 'ban')),
  duration_hours INTEGER, -- NULL for permanent
  expires_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moderation_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_warnings_select_admin" ON moderation_warnings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "moderation_warnings_select_self" ON moderation_warnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "moderation_warnings_insert_admin" ON moderation_warnings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE INDEX IF NOT EXISTS idx_moderation_warnings_user ON moderation_warnings (user_id);

-- Suppression des profils signales
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 4. 🟡 Maintenance mode
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT false,
  message TEXT DEFAULT 'Erosia est actuellement en maintenance. Reviens dans quelques instants !',
  estimated_duration TEXT,
  started_at TIMESTAMPTZ,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_mode_select" ON maintenance_mode FOR SELECT USING (true);
CREATE POLICY "maintenance_mode_update_admin" ON maintenance_mode FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Maintenance log
CREATE TABLE IF NOT EXISTS maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('enabled', 'disabled', 'updated_message', 'updated_duration')),
  message TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_log_select_admin" ON maintenance_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "maintenance_log_insert_admin" ON maintenance_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Insert default maintenance record
INSERT INTO maintenance_mode (id, active) VALUES (gen_random_uuid(), false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. 🟢 Notification preferences enhanced
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  new_match BOOLEAN NOT NULL DEFAULT true,
  new_message BOOLEAN NOT NULL DEFAULT true,
  new_like BOOLEAN NOT NULL DEFAULT true,
  super_like BOOLEAN NOT NULL DEFAULT true,
  story_reply BOOLEAN NOT NULL DEFAULT true,
  date_proposal BOOLEAN NOT NULL DEFAULT true,
  date_reminder BOOLEAN NOT NULL DEFAULT true,
  gift_received BOOLEAN NOT NULL DEFAULT true,
  event_invite BOOLEAN NOT NULL DEFAULT true,
  promo BOOLEAN NOT NULL DEFAULT true,
  level_up BOOLEAN NOT NULL DEFAULT true,
  achievement BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_select" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 6. 🟢 System status / health checks
-- ============================================================
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_health_select" ON system_health FOR SELECT USING (true);

-- ============================================================
-- 7. 🟢 Admin activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_activity_log_select" ON admin_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "admin_activity_log_insert" ON admin_activity_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log (created_at DESC);

-- ============================================================
-- 8. 🟢 Profile completion function
-- ============================================================
CREATE OR REPLACE FUNCTION compute_profile_completion(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_score INTEGER := 0;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Photos (0-25 points)
  IF v_profile.photos IS NOT NULL THEN
    v_score := v_score + LEAST(array_length(v_profile.photos, 1), 5) * 5;
  END IF;

  -- Bio (0-20 points)
  IF v_profile.bio IS NOT NULL AND length(v_profile.bio) > 0 THEN
    v_score := v_score + LEAST(20, length(v_profile.bio) / 5);
  END IF;

  -- Interests (0-15 points)
  IF v_profile.interests IS NOT NULL THEN
    v_score := v_score + LEAST(array_length(v_profile.interests, 1), 5) * 3;
  END IF;

  -- Looking for (5 points)
  IF v_profile.looking_for IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  -- Name (5 points)
  IF v_profile.name IS NOT NULL AND length(v_profile.name) > 0 THEN
    v_score := v_score + 5;
  END IF;

  -- Age (5 points)
  IF v_profile.age IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  -- Gender (5 points)
  IF v_profile.gender IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  -- Location (5 points)
  IF v_profile.location IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  -- Verified (10 points)
  IF v_profile.is_verified THEN
    v_score := v_score + 10;
  END IF;

  -- Onboarding complete (10 points)
  IF v_profile.onboarding_complete THEN
    v_score := v_score + 10;
  END IF;

  -- Occupation (5 points)
  IF v_profile.occupation IS NOT NULL AND length(v_profile.occupation) > 0 THEN
    v_score := v_score + 5;
  END IF;

  v_score := LEAST(v_score, 100);
  UPDATE profiles SET profile_completion = v_score WHERE id = p_user_id;
  RETURN v_score;
END;
$$;

-- ============================================================
-- 9. 🟢 Trigger: update profile_completion on profile changes
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM compute_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_completion ON profiles;
CREATE TRIGGER trg_profile_completion
  AFTER INSERT OR UPDATE OF name, bio, photos, interests, looking_for, age, gender, location, is_verified, onboarding_complete, occupation
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_profile_completion();

-- ============================================================
-- 10. 🟢 Onboarding step tracking
-- ============================================================
CREATE OR REPLACE FUNCTION set_onboarding_step(p_user_id UUID, p_step INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET onboarding_step = p_step WHERE id = p_user_id;
END;
$$;
