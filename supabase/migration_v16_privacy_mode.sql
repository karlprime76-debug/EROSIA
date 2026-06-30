-- Erosia Schema v16 — Privacy Mode
-- Safe à ré-exécuter (IF NOT EXISTS / OR REPLACE)

-- ==============================
-- 0. profile_visible column on profiles (for efficient query filtering)
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_profiles_profile_visible ON profiles(profile_visible) WHERE profile_visible = true;

-- ==============================
-- 1. privacy_settings table
-- ==============================
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
CREATE POLICY "Users can view own privacy_settings"
  ON privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can insert own privacy_settings"
  ON privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can update own privacy_settings"
  ON privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can SELECT privacy_settings for checks" ON privacy_settings;
CREATE POLICY "Authenticated can SELECT privacy_settings for checks"
  ON privacy_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==============================
-- 2. Auto-create privacy_settings on profile creation
-- ==============================
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
