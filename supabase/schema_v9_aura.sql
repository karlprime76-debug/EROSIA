-- Erosia Schema v9 - Aura system
-- Run this after schema_v8_social_space.sql

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

CREATE INDEX IF NOT EXISTS idx_aura_snapshots_level ON aura_snapshots(level DESC);
CREATE INDEX IF NOT EXISTS idx_aura_snapshots_updated ON aura_snapshots(updated_at DESC);

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
