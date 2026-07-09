-- Erosia Schema v30 — Stories RLS fixes
-- 1. Enforce close_friends privacy on stories SELECT (owner or match only)
-- 2. Restrict story_views SELECT to story owner only

-- ── 1. Fix stories SELECT RLS ──
DROP POLICY IF EXISTS "Users can view stories of non-incognito non-blocked users" ON stories;
CREATE POLICY "Users can view stories of non-incognito non-blocked users"
  ON stories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = stories.user_id
      AND (profiles.incognito = false OR profiles.id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocks.blocker_id = stories.user_id
      AND blocks.blocked_id = auth.uid()
    )
    AND (
      stories.privacy IS DISTINCT FROM 'close_friends'
      OR stories.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM matches
        WHERE (matches.user1_id = stories.user_id AND matches.user2_id = auth.uid())
           OR (matches.user2_id = stories.user_id AND matches.user1_id = auth.uid())
      )
    )
  );

-- ── 2. Fix story_views SELECT RLS (restrict to story owner) ──
DROP POLICY IF EXISTS "Users can view story views" ON story_views;
CREATE POLICY "Users can view story views"
  ON story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );
