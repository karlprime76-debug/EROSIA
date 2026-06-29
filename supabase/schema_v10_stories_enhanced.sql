-- Erosia Schema v10 - Enhanced Stories (views, reactions, privacy)
-- Run this after schema_v9_aura.sql

-- ==============================
-- 1. Add privacy + compression to existing stories
-- ==============================
ALTER TABLE stories ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'close_friends'));
ALTER TABLE stories ADD COLUMN IF NOT EXISTS compression_quality REAL;

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_privacy ON stories(privacy);

-- ==============================
-- 2. Story views
-- ==============================
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

-- ==============================
-- 3. Story reactions
-- ==============================
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
