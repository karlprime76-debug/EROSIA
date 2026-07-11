-- Migration v43: Advanced Search — saved searches + filter profiles table

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id);

-- Add profile columns needed for advanced filters (if not exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height INT CHECK (height >= 100 AND height <= 250);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT CHECK (char_length(education) <= 200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoker TEXT CHECK (smoker IN ('yes','no','sometimes'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drinker TEXT CHECK (drinker IN ('yes','no','sometimes'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wants_kids TEXT CHECK (wants_kids IN ('yes','no','open'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_pets TEXT CHECK (has_pets IN ('yes','no','open'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sports TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music TEXT[] DEFAULT '{}';

-- Indexes for filterable columns
CREATE INDEX IF NOT EXISTS idx_profiles_height ON profiles(height) WHERE height IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_smoker ON profiles(smoker) WHERE smoker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_drinker ON profiles(drinker) WHERE drinker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON profiles USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_profiles_sports ON profiles USING GIN (sports);
CREATE INDEX IF NOT EXISTS idx_profiles_music ON profiles USING GIN (music);
