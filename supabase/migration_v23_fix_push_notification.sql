-- Migration v23: Fix send_push_on_notification function
-- net.http_post expects body as jsonb, not text
-- The ::text cast caused: "function net.http_post(url => text, headers => jsonb, body => text) does not exist"

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
  push_url TEXT;
  push_key TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_url TEXT;
BEGIN
  -- Get push subscription for this user
  SELECT endpoint, p256dh_key, auth_key INTO push_url, push_key, notif_body
  FROM push_subscriptions WHERE user_id = NEW.user_id LIMIT 1;

  -- Build actor name
  actor_name := COALESCE((SELECT name FROM profiles WHERE id = NEW.actor_id), 'Quelqu\'un');

  -- Build notification content based on type
  IF NEW.type = 'match' THEN
    notif_title := 'Nouveau match !';
    notif_body := actor_name || ' t\'aime aussi ❤️';
    notif_url := '/matches';
  ELSIF NEW.type = 'message' THEN
    notif_title := 'Nouveau message';
    notif_body := actor_name || ' t\'a envoyé un message';
    notif_url := '/chat/' || (NEW.metadata->>'match_id');
  ELSE
    notif_title := 'Erosia';
    notif_body := 'Tu as une nouvelle notification';
    notif_url := '/notifications';
  END IF;

  -- Call push API via pg_net
  IF push_url IS NOT NULL AND push_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := push_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-api-key', push_key
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
