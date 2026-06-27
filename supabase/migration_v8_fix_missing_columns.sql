-- Migration v8: Fix missing columns in profiles table
-- These columns are referenced by the codebase but were never created

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_remaining INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_reset_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude FLOAT8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude FLOAT8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
