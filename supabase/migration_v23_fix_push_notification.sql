-- Migration v23: Fix send_push_on_notification function
-- net.http_post expects body as jsonb, not text
-- The ::text cast caused: "function net.http_post(url => text, headers => jsonb, body => text) does not exist"

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
  push_url TEXT := current_setting('app.push_api_url', true);
  push_key TEXT := current_setting('app.push_api_key', true);
  notif_type TEXT;
  notif_title TEXT;
  notif_body TEXT;
  notif_url TEXT;
BEGIN
  -- Get actor name
  SELECT name INTO actor_name FROM profiles WHERE id = NEW.actor_id;

  -- Determine notification content
  notif_type := NEW.type;

  IF notif_type = 'match' THEN
    notif_title := 'Nouveau match !';
    notif_body := actor_name || ' t''a liké·e aussi ❤️';
    notif_url := '/matches';
  ELSIF notif_type = 'flirt' THEN
    notif_title := 'Clin d''œil reçu !';
    notif_body := actor_name || ' t''a envoyé un clin d''œil 😉';
    notif_url := '/matches';
  ELSIF notif_type = 'message' THEN
    notif_title := 'Nouveau message';
    notif_body := actor_name || ' t''a envoyé un message';
    notif_url := '/chat/' || (NEW.metadata->>'match_id');
  ELSE
    notif_title := 'Erosia';
    notif_body := 'Tu as une nouvelle notification';
    notif_url := '/notifications';
  END IF;

  -- Call push API via pg_net (body must be jsonb, not text)
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
