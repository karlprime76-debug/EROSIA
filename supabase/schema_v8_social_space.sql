-- Erosia Schema v8 - Social Space 3D mode
-- Run this after schema_v7_payment_accounts.sql

-- ==============================
-- 1. social_spaces (predefined 3D environments)
-- ==============================
CREATE TABLE IF NOT EXISTS social_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('beach', 'rooftop', 'lounge', 'garden', 'coffee')),
  description TEXT,
  capacity INT DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view social_spaces" ON social_spaces;
CREATE POLICY "All authenticated can view social_spaces"
  ON social_spaces FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==============================
-- 2. space_presence (users currently in spaces)
-- ==============================
CREATE TABLE IF NOT EXISTS space_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES social_spaces(id) ON DELETE CASCADE NOT NULL,
  x DOUBLE PRECISION DEFAULT 0,
  y DOUBLE PRECISION DEFAULT 0,
  z DOUBLE PRECISION DEFAULT 0,
  rotation_y DOUBLE PRECISION DEFAULT 0,
  animation TEXT DEFAULT 'idle' CHECK (animation IN ('idle', 'walking', 'standing', 'sitting', 'dancing', 'waving')),
  entered_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_presence_space_id ON space_presence(space_id);
CREATE INDEX IF NOT EXISTS idx_space_presence_user_id ON space_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_space_presence_active ON space_presence(last_active_at);

ALTER TABLE space_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view space_presence" ON space_presence;
CREATE POLICY "All authenticated can view space_presence"
  ON space_presence FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own presence" ON space_presence;
CREATE POLICY "Users can insert own presence"
  ON space_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presence" ON space_presence;
CREATE POLICY "Users can update own presence"
  ON space_presence FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presence" ON space_presence;
CREATE POLICY "Users can delete own presence"
  ON space_presence FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- 3. Seed default spaces
-- ==============================
INSERT INTO social_spaces (name, type, description, capacity, metadata) VALUES
  ('Plage Paradis', 'beach', 'Une plage virtuelle au coucher du soleil avec vue sur l''océan', 80, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#FF8C42",
    "sky_color": "#FF6B35",
    "ground_color": "#F4D03F",
    "water_color": "#1E90FF",
    "music": "ambient_ocean",
    "objects": ["palm_trees", "beach_chairs", "bonfire", "beach_umbrellas"]
  }'::jsonb),
  ('Rooftop Urbain', 'rooftop', 'Un rooftop chic en pleine ville avec vue panoramique', 60, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#1A1A2E",
    "sky_color": "#16213E",
    "ground_color": "#0F3460",
    "accent_color": "#E94560",
    "music": "chill_lofi",
    "objects": ["sofas", "bar", "string_lights", "city_skyline"]
  }'::jsonb),
  ('Lounge Cosy', 'lounge', 'Un salon feutré et intime avec cheminée et bibliothèque', 30, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#2D1810",
    "wall_color": "#8B4513",
    "accent_color": "#D4A574",
    "music": "jazz_soft",
    "objects": ["fireplace", "bookshelves", "armchairs", "rug", "plants"]
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;
