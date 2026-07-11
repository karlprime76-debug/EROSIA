-- Migration v42: Stories enhancement — archiving + reply tracking

-- 1. Add archived column
ALTER TABLE stories ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_stories_archived ON stories(archived) WHERE archived = true;

-- 2. Add reply_to column (for private replies on stories)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS reply_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- 3. Add caption column (if not exists)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption TEXT CHECK (char_length(caption) <= 200);

-- 4. Function to archive expired stories instead of immediate delete
CREATE OR REPLACE FUNCTION archive_expired_stories()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE stories
  SET archived = true
  WHERE expires_at < now() AND archived = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. Add story_reply_notifications trigger
CREATE OR REPLACE FUNCTION notify_story_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, actor_id, metadata)
  VALUES (
    (SELECT user_id FROM stories WHERE id = NEW.reply_story_id),
    'story_replied',
    'Réponse à ta story',
    (SELECT name FROM profiles WHERE id = NEW.user_id) || ' a répondu à ta story.',
    NEW.user_id,
    jsonb_build_object('story_id', NEW.id, 'type', 'story_reply')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_story_reply
  AFTER INSERT ON stories
  FOR EACH ROW
  WHEN (NEW.reply_story_id IS NOT NULL)
  EXECUTE FUNCTION notify_story_reply();

-- 6. RLS policy for archiving (owner can archive)
CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Function to get archived stories
CREATE OR REPLACE FUNCTION get_archived_stories(p_user_id UUID)
RETURNS SETOF stories LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM stories
  WHERE user_id = p_user_id AND archived = true
  ORDER BY created_at DESC
  LIMIT 50;
$$;
