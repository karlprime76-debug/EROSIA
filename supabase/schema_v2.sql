-- Erosia Schema v2 - Colonnes manquantes sur profiles
-- À exécuter après schema.sql
-- Ajoute toutes les colonnes utilisées par le code mais jamais créées

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_remaining INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_reset_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_incognito ON profiles(incognito);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;
