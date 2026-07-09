-- Add missing title/message columns for webhook-created notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;

-- Add notif_push / notif_email columns to profiles (used by settings but missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_push BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_email BOOLEAN DEFAULT true;

-- Fix actor_id FK: SET NULL on delete to avoid dangling references
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add notifications to the Realtime publication so the badge updates live
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Create notification for super_like
CREATE OR REPLACE FUNCTION notify_super_like()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, metadata)
  VALUES (NEW.swiped_id, 'super_like', NEW.swiper_id, jsonb_build_object());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_super_like ON swipes;
CREATE TRIGGER on_super_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  WHEN (NEW.direction = 'super_like')
  EXECUTE FUNCTION notify_super_like();

-- Update push notification trigger to handle gift/verification/super_like types
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_url TEXT;
  push_api_url TEXT;
  push_api_key TEXT;
BEGIN
  SELECT name INTO actor_name FROM profiles WHERE id = NEW.actor_id;

  CASE NEW.type
    WHEN 'match' THEN
      notif_title := 'Nouveau match !';
      notif_body := actor_name || ' veut faire ta connaissance !';
      notif_url := '/matches';
    WHEN 'flirt' THEN
      notif_title := 'Clin d''œil reçu';
      notif_body := actor_name || ' t''a envoyé un clin d''œil';
      notif_url := '/matches';
    WHEN 'message' THEN
      notif_title := 'Nouveau message';
      notif_body := actor_name || ' t''a envoyé un message';
      notif_url := '/matches';
    WHEN 'super_like' THEN
      notif_title := 'Super like !';
      notif_body := actor_name || ' t''a envoyé un super like ❤️';
      notif_url := '/matches';
    WHEN 'gift' THEN
      notif_title := 'Cadeau reçu !';
      notif_body := actor_name || ' t''a envoyé un cadeau';
      notif_url := '/island';
    WHEN 'verification' THEN
      notif_title := 'Vérification approuvée';
      notif_body := 'Ton identité a été vérifiée avec succès.';
      notif_url := '/profile';
    ELSE
      notif_title := 'Nouvelle notification';
      notif_body := 'Tu as une nouvelle notification sur Erosia';
      notif_url := '/notifications';
  END CASE;

  push_api_url := current_setting('app.push_api_url', true);
  push_api_key := current_setting('app.push_api_key', true);

  IF push_api_url IS NOT NULL AND push_api_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := push_api_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-api-key', push_api_key
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', notif_title,
        'body', notif_body,
        'url', notif_url
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
