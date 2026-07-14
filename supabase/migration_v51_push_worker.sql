-- Migration v51: Fix push notification trigger + worker support
-- Date: 2026-07-14

-- 1. Add push_sent_at column to track which notifications were pushed
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_push_unsent ON notifications(push_sent_at) WHERE push_sent_at IS NULL;

-- 2. Replace the broken send_push_on_notification function
-- Old version sent subscription details directly (endpoint, p256dh, auth) which doesn't match the API
-- New version: generates title/body, respects prefs, sends userId to the API
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_notif_push boolean;
  v_push_enabled boolean;
  v_type_enabled boolean;
  v_quiet_start text;
  v_quiet_end text;
  v_now_time text;
  v_now_interval interval;
  v_actor_username text;
  v_has_prefs boolean;
  v_push_url text;
  v_push_key text;
BEGIN
  -- Skip if already sent (safety check)
  IF NEW.push_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Check global push opt-in
  SELECT notif_push INTO v_notif_push FROM profiles WHERE id = NEW.user_id;
  IF NOT COALESCE(v_notif_push, true) THEN
    NEW.push_sent_at := now();
    RETURN NEW;
  END IF;

  -- 2. Check notification_preferences
  SELECT true, push_enabled,
         CASE NEW.type::text
           WHEN 'match' THEN new_match
           WHEN 'message' THEN new_message
           WHEN 'like' THEN new_like
           WHEN 'super_like' THEN super_like
           WHEN 'story_reply' THEN story_reply
           WHEN 'date_proposal' THEN date_proposal
           WHEN 'date_reminder' THEN date_reminder
           WHEN 'gift' THEN gift_received
           WHEN 'event_invite' THEN event_invite
           WHEN 'level_up' THEN level_up
           WHEN 'achievement' THEN achievement
           ELSE true
         END,
         quiet_hours_start,
         quiet_hours_end
  INTO v_has_prefs, v_push_enabled, v_type_enabled, v_quiet_start, v_quiet_end
  FROM notification_preferences WHERE user_id = NEW.user_id;

  IF v_has_prefs THEN
    IF NOT COALESCE(v_push_enabled, true) OR NOT COALESCE(v_type_enabled, true) THEN
      NEW.push_sent_at := now();
      RETURN NEW;
    END IF;

    -- 3. Check quiet hours
    IF v_quiet_start IS NOT NULL AND v_quiet_end IS NOT NULL THEN
      v_now_time := to_char(now() AT TIME ZONE 'UTC', 'HH24:MI');
      IF v_quiet_start < v_quiet_end THEN
        IF v_now_time >= v_quiet_start AND v_now_time <= v_quiet_end THEN
          NEW.push_sent_at := now();
          RETURN NEW;
        END IF;
      ELSE
        IF v_now_time >= v_quiet_start OR v_now_time <= v_quiet_end THEN
          NEW.push_sent_at := now();
          RETURN NEW;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 4. Generate title and body based on type
  SELECT username INTO v_actor_username FROM profiles WHERE id = NEW.actor_id;

  CASE NEW.type
    WHEN 'match' THEN
      v_title := 'Nouveau match !';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' vous a matché';
    WHEN 'message' THEN
      v_title := 'Nouveau message';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' vous a envoyé un message';
    WHEN 'super_like' THEN
      v_title := 'Super like !';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' vous a super liké';
    WHEN 'like' THEN
      v_title := 'Nouveau like';
      v_body := 'Quelqu\'un vous a liké';
    WHEN 'gift' THEN
      v_title := 'Cadeau reçu !';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' vous a envoyé un cadeau';
    WHEN 'story_reply' THEN
      v_title := 'Réponse à votre story';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' a répondu à votre story';
    WHEN 'date_proposal' THEN
      v_title := 'Proposition de rendez-vous';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' veut vous rencontrer';
    WHEN 'date_accepted' THEN
      v_title := 'Rendez-vous accepté !';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' a accepté votre rendez-vous';
    WHEN 'date_reminder' THEN
      v_title := 'Rappel de rendez-vous';
      v_body := 'Vous avez un rendez-vous bientôt';
    WHEN 'date_cancelled' THEN
      v_title := 'Rendez-vous annulé';
      v_body := COALESCE(v_actor_username, 'Quelqu\'un') || ' a annulé votre rendez-vous';
    WHEN 'event_invite' THEN
      v_title := 'Invitation à un événement';
      v_body := 'Vous êtes invité à un événement';
    WHEN 'level_up' THEN
      v_title := 'Niveau supérieur !';
      v_body := 'Vous avez gagné un niveau !';
    WHEN 'achievement' THEN
      v_title := 'Succès débloqué !';
      v_body := 'Vous avez débloqué un nouveau succès';
    ELSE
      v_title := 'Erosia';
      v_body := 'Vous avez une nouvelle notification';
  END CASE;

  -- Override with stored title/message if they exist
  IF NEW.title IS NOT NULL THEN v_title := NEW.title; END IF;
  IF NEW.message IS NOT NULL THEN v_body := NEW.message; END IF;

  -- Store generated title/message in the notification row
  NEW.title := v_title;
  NEW.message := v_body;

  -- Set action_url from metadata if not already set
  IF NEW.action_url IS NULL THEN
    CASE NEW.type
      WHEN 'match' THEN
        NEW.action_url := '/chat/' || COALESCE(NEW.metadata->>'match_id', '');
      WHEN 'message' THEN
        NEW.action_url := '/chat/' || COALESCE(NEW.metadata->>'match_id', '');
      WHEN 'super_like' THEN
        NEW.action_url := '/discover';
      WHEN 'gift' THEN
        NEW.action_url := '/island';
      WHEN 'story_reply' THEN
        NEW.action_url := '/stories';
      WHEN 'date_proposal' THEN
        NEW.action_url := '/dates';
      WHEN 'date_accepted' THEN
        NEW.action_url := '/dates';
      WHEN 'date_reminder' THEN
        NEW.action_url := '/dates';
      ELSE
        NEW.action_url := '/discover';
    END CASE;
  END IF;

  -- 5. Try pg_net if configured (best-effort)
  v_push_url := current_setting('app.settings.push_api_url', true);
  v_push_key := current_setting('app.settings.push_api_key', true);
  IF v_push_url IS NOT NULL AND v_push_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_push_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-api-key', v_push_key
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', v_title,
        'body', v_body,
        'url', COALESCE(NEW.action_url, '/discover')
      )
    );
  END IF;

  -- Do NOT set push_sent_at — the worker will pick up NULL rows,
  -- re-check prefs, send push, and mark as sent.
  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger (BEFORE INSERT so we can modify NEW.title/NEW.message)
DROP TRIGGER IF EXISTS send_push_on_notification_trigger ON notifications;
CREATE TRIGGER send_push_on_notification_trigger
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();
