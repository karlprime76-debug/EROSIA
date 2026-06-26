-- Starter pack : nouvelle colonne onboarding_complete
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;
