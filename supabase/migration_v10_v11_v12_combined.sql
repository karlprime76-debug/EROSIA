-- Erosia Schema v10–v12 Combined
-- Run ALL at once in the Supabase SQL Editor
-- WARNING: All statements use IF NOT EXISTS / IF NOT EXISTS / DROP POLICY IF EXISTS — safe to re-run

-- ============================================================
-- v10: Enhanced Stories (privacy, views, reactions)
-- ============================================================

ALTER TABLE stories ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'close_friends'));
ALTER TABLE stories ADD COLUMN IF NOT EXISTS compression_quality REAL;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS compressed_url TEXT;

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_privacy ON stories(privacy);

CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user ON story_views(user_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view story views" ON story_views;
CREATE POLICY "Users can view story views"
  ON story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_views.story_id
      AND (stories.user_id = auth.uid() OR auth.role() = 'authenticated')
    )
  );

DROP POLICY IF EXISTS "Users can insert own story views" ON story_views;
CREATE POLICY "Users can insert own story views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view story reactions" ON story_reactions;
CREATE POLICY "Anyone can view story reactions"
  ON story_reactions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own story reactions" ON story_reactions;
CREATE POLICY "Users can insert own story reactions"
  ON story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own story reactions" ON story_reactions;
CREATE POLICY "Users can update own story reactions"
  ON story_reactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own story reactions" ON story_reactions;
CREATE POLICY "Users can delete own story reactions"
  ON story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- v11: Enhanced Events (image, category, storage)
-- ============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('sport', 'culture', 'food', 'music', 'travel', 'games', 'workshop', 'other'));

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

INSERT INTO storage.buckets (id, name, public) VALUES ('event_images', 'event_images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read event images" ON storage.objects;
CREATE POLICY "Public read event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event_images');

DROP POLICY IF EXISTS "Auth upload event images" ON storage.objects;
CREATE POLICY "Auth upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event_images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Event images owner update" ON storage.objects;
CREATE POLICY "Event images owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event_images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Event images owner delete" ON storage.objects;
CREATE POLICY "Event images owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event_images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Events can be read by everyone" ON events;
CREATE POLICY "Events can be read by everyone"
  ON events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Events can be created by authenticated" ON events;
CREATE POLICY "Events can be created by authenticated"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Events can be updated by creator" ON events;
CREATE POLICY "Events can be updated by creator"
  ON events FOR UPDATE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Events can be deleted by creator" ON events;
CREATE POLICY "Events can be deleted by creator"
  ON events FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================
-- v12: Social Rooms (rooms, room_presence, realtime)
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('beach', 'lounge', 'rooftop', 'festival', 'coffee')),
  description TEXT,
  capacity INT NOT NULL DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view rooms" ON rooms;
CREATE POLICY "All authenticated can view rooms"
  ON rooms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS room_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  x DOUBLE PRECISION DEFAULT 0,
  y DOUBLE PRECISION DEFAULT 0,
  z DOUBLE PRECISION DEFAULT 0,
  rotation_y DOUBLE PRECISION DEFAULT 0,
  animation TEXT DEFAULT 'idle' CHECK (animation IN ('idle', 'walking', 'standing', 'sitting', 'dancing', 'waving', 'floating')),
  entered_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON room_presence(room_id);
CREATE INDEX IF NOT EXISTS idx_room_presence_user_id ON room_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_room_presence_active ON room_presence(last_active_at);

ALTER TABLE room_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view room_presence" ON room_presence;
CREATE POLICY "All authenticated can view room_presence"
  ON room_presence FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own room_presence" ON room_presence;
CREATE POLICY "Users can insert own room_presence"
  ON room_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own room_presence" ON room_presence;
CREATE POLICY "Users can update own room_presence"
  ON room_presence FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own room_presence" ON room_presence;
CREATE POLICY "Users can delete own room_presence"
  ON room_presence FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE room_presence;

INSERT INTO rooms (name, type, description, capacity, metadata) VALUES
  ('Beach', 'beach', 'Plage virtuelle au coucher du soleil — vagues, palmiers, feu de camp', 80, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#FF8C42",
    "sky_color": "#FF6B35",
    "ground_color": "#F4D03F",
    "water_color": "#1E90FF",
    "music": "ambient_ocean",
    "objects": ["palm_trees", "beach_chairs", "bonfire", "umbrellas"]
  }'::jsonb),

  ('Lounge', 'lounge', 'Salon feutré avec cheminée, jazz et fauteuils cosy', 30, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#2D1810",
    "wall_color": "#8B4513",
    "accent_color": "#D4A574",
    "music": "jazz_soft",
    "objects": ["fireplace", "bookshelves", "armchairs", "rug", "plants"]
  }'::jsonb),

  ('Rooftop', 'rooftop', 'Rooftop chic avec vue panoramique sur la ville', 60, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#1A1A2E",
    "sky_color": "#16213E",
    "ground_color": "#0F3460",
    "accent_color": "#E94560",
    "music": "chill_lofi",
    "objects": ["sofas", "bar", "string_lights", "city_skyline"]
  }'::jsonb),

  ('Festival', 'festival', 'Festival en plein air — scène, dancefloor, food trucks', 120, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#6C1F8A",
    "ground_color": "#4A0E5C",
    "accent_color": "#FFD700",
    "music": "electronic",
    "objects": ["stage", "dancefloor", "food_trucks", "lights", "benches"]
  }'::jsonb),

  ('Coffee', 'coffee', 'Café cosy pour discuter autour d''un verre', 20, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#3E2723",
    "wall_color": "#5D4037",
    "accent_color": "#A1887F",
    "music": "acoustic",
    "objects": ["tables", "chairs", "counter", "books", "plants"]
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;
