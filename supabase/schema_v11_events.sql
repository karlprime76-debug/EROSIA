-- Erosia Schema v11 - Enhanced Events (image, category, storage)
-- Run after schema_v10_stories_enhanced.sql

-- ==============================
-- 1. Add columns
-- ==============================
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('sport', 'culture', 'food', 'music', 'travel', 'games', 'workshop', 'other'));

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- ==============================
-- 2. Storage bucket
-- ==============================
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

-- ==============================
-- 3. Update RLS on events table
-- ==============================
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
