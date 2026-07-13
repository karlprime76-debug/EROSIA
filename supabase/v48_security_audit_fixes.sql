-- ============================================================================
-- Erosia v48 — Security Audit Fixes
-- Fixes issues found in Audit 16:
--   1. Permissive RLS on user_stats, user_levels, user_achievements
--   2. Missing search_path on SECURITY DEFINER functions
--   3. Storage bucket file size / MIME type restrictions
--   4. Missing indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix RLS on user_stats — restrict to own rows
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;

CREATE POLICY "Users can insert their own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Fix RLS on user_levels — restrict to own rows
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own levels" ON user_levels;
DROP POLICY IF EXISTS "Users can update their own levels" ON user_levels;
DROP POLICY IF EXISTS "Users can read own levels" ON user_levels;

CREATE POLICY "Users can insert their own levels" ON user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own levels" ON user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own levels" ON user_levels
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Fix RLS on user_achievements — restrict to own rows
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can read own achievements" ON user_achievements;

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Fix missing search_path on SECURITY DEFINER functions
--    Only the most critical ones are fixed here (those identified in audit)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_compatibility(user_a uuid, user_b uuid)
RETURNS real
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score real := 50;
  profile_a record;
  profile_b record;
BEGIN
  SELECT * INTO profile_a FROM profiles WHERE id = user_a;
  SELECT * INTO profile_b FROM profiles WHERE id = user_b;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Age proximity: up to 15 points
  IF profile_a.age IS NOT NULL AND profile_b.age IS NOT NULL THEN
    score := score + GREATEST(0, 15 - ABS(profile_a.age - profile_b.age));
  END IF;

  -- Distance: up to 20 points
  IF profile_a.latitude IS NOT NULL AND profile_b.latitude IS NOT NULL THEN
    score := score + GREATEST(0, 20 - (ABS(profile_a.latitude - profile_b.latitude) * 111 + ABS(profile_a.longitude - profile_b.longitude) * 111) / 10);
  END IF;

  -- Shared interests: up to 25 points
  IF profile_a.interests IS NOT NULL AND profile_b.interests IS NOT NULL THEN
    score := score + LEAST(25, (SELECT COUNT(*) FROM unnest(profile_a.interests) AS i WHERE i = ANY(profile_b.interests)) * 5);
  END IF;

  -- Looking for compatibility: up to 15 points
  IF profile_a.looking_for IS NOT NULL AND profile_b.looking_for IS NOT NULL THEN
    score := score + CASE WHEN profile_a.looking_for = profile_b.looking_for THEN 15 ELSE 0 END;
  END IF;

  RETURN LEAST(100, GREATEST(0, score));
END;
$$;

-- Fix handle_mutual_like (match creation trigger)
CREATE OR REPLACE FUNCTION public.handle_mutual_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_id uuid;
  lock_key bigint;
BEGIN
  lock_key := GREATEST(NEW.swiper_id::bigint, NEW.swiped_id::bigint) * 1000000 + LEAST(NEW.swiper_id::bigint, NEW.swiped_id::bigint);
  PERFORM pg_advisory_xact_lock(lock_key);

  IF NEW.direction = 'super_like' AND EXISTS (SELECT 1 FROM swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'super_like') THEN
    INSERT INTO matches (user1_id, user2_id) VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id)) RETURNING id INTO match_id;
    INSERT INTO notifications (user_id, type, actor_id, metadata) VALUES (NEW.swiped_id, 'match', NEW.swiper_id, jsonb_build_object('match_id', match_id, 'is_super_like', true));
    RETURN NEW;
  END IF;

  IF NEW.direction = 'like' AND EXISTS (SELECT 1 FROM swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id AND direction = 'like') THEN
    INSERT INTO matches (user1_id, user2_id) VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id)) RETURNING id INTO match_id;
    INSERT INTO notifications (user_id, type, actor_id, metadata) VALUES (NEW.swiped_id, 'match', NEW.swiper_id, jsonb_build_object('match_id', match_id));
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix send_push_on_notification trigger
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  push_endpoint text;
  push_p256dh text;
  push_auth text;
BEGIN
  FOR push_endpoint, push_p256dh, push_auth IN
    SELECT p.endpoint, p.p256dh, p.auth FROM push_subscriptions p WHERE p.user_id = NEW.user_id
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.push_api_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.push_api_key', true))
      ),
      body := jsonb_build_object(
        'endpoint', push_endpoint,
        'p256dh', push_p256dh,
        'auth', push_auth,
        'title', NEW.title,
        'message', NEW.message,
        'url', NEW.action_url,
        'type', NEW.type,
        'metadata', NEW.metadata
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Fix notify_match trigger
CREATE OR REPLACE FUNCTION public.notify_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, metadata)
  VALUES
    (NEW.user1_id, 'match', NEW.user2_id, jsonb_build_object('match_id', NEW.id)),
    (NEW.user2_id, 'match', NEW.user1_id, jsonb_build_object('match_id', NEW.id));
  RETURN NEW;
END;
$$;

-- Fix notify_message trigger
CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_user_id uuid;
BEGIN
  SELECT CASE WHEN m.user1_id = NEW.sender_id THEN m.user2_id ELSE m.user1_id END INTO other_user_id
  FROM matches m WHERE m.id = NEW.match_id;

  IF other_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, actor_id, metadata)
    VALUES (other_user_id, 'message', NEW.sender_id, jsonb_build_object('match_id', NEW.match_id, 'message_id', NEW.id, 'preview', LEFT(NEW.text, 80)));
  END IF;
  RETURN NEW;
END;
$$;

-- Fix notify_flirt trigger
CREATE OR REPLACE FUNCTION public.notify_flirt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, metadata)
  VALUES (NEW.receiver_id, 'like', NEW.sender_id, '{}'::jsonb);
  RETURN NEW;
END;
$$;

-- Fix notify_super_like trigger
CREATE OR REPLACE FUNCTION public.notify_super_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'super_like' THEN
    INSERT INTO notifications (user_id, type, actor_id, metadata)
    VALUES (NEW.swiped_id, 'super_like', NEW.swiper_id, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_streak trigger
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_id uuid;
  last_msg_date date;
BEGIN
  SELECT CASE WHEN m.user1_id = NEW.sender_id THEN m.user2_id ELSE m.user1_id END INTO other_id
  FROM matches m WHERE m.id = NEW.match_id;

  IF other_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO streaks (user_id, current_streak, longest_streak, last_message_date)
  VALUES (NEW.sender_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN streaks.last_message_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
      WHEN streaks.last_message_date = CURRENT_DATE THEN streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      streaks.longest_streak,
      CASE
        WHEN streaks.last_message_date = CURRENT_DATE - 1 THEN streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_message_date = CURRENT_DATE;

  RETURN NEW;
END;
$$;

-- Fix trigger_recompute_aura (profile creation trigger)
CREATE OR REPLACE FUNCTION public.trigger_recompute_aura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO aura_snapshots (user_id, level, color, secondary_color, glow_intensity, particle_count, label, factors)
  VALUES (NEW.id, 1, '#6366f1', '#a5b4fc', 0.3, 20, 'Brouillard', '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix handle_verification_approval (verification_requests trigger)
CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles SET is_verified = true, verification_status = 'verified', verified_at = NOW() WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix sync_profile_visible (privacy_settings trigger)
CREATE OR REPLACE FUNCTION public.sync_profile_visible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET profile_visible = NEW.profile_visible WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Fix trigger_create_privacy_settings (profile creation trigger)
CREATE OR REPLACE FUNCTION public.trigger_create_privacy_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO privacy_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix set_last_seen (auth trigger)
CREATE OR REPLACE FUNCTION public.set_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET last_active_at = NOW(), last_seen = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Fix mark_messages_read RPC
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_match_id uuid, p_reader_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages SET read_at = NOW() WHERE match_id = p_match_id AND sender_id != p_reader_id AND read_at IS NULL;
  UPDATE matches SET read_count = read_count + 1 WHERE id = p_match_id;
END;
$$;

-- Fix get_unread_count RPC
CREATE OR REPLACE FUNCTION public.get_unread_count(p_match_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count integer;
BEGIN
  SELECT COUNT(*) INTO count FROM messages WHERE match_id = p_match_id AND sender_id != p_user_id AND read_at IS NULL;
  RETURN count;
END;
$$;

-- Fix is_blocked RPC
CREATE OR REPLACE FUNCTION public.is_blocked(blocker_id uuid, blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_block boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2) INTO exists_block;
  RETURN exists_block;
END;
$$;

-- Fix get_blocked_ids RPC
CREATE OR REPLACE FUNCTION public.get_blocked_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT blocked_id FROM blocks WHERE blocker_id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Add missing indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sent_gifts_status ON sent_gifts(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- ----------------------------------------------------------------------------
-- 6. Storage bucket MIME type and size restrictions
--    Apply via Supabase Dashboard or API — not repeatable in raw SQL
--    Recommended limits:
--      photos: image/*, max 10MB
--      stories: image/*, video/*, max 50MB
--      profile_videos: video/*, max 100MB
--      chat_photos: image/*, max 10MB
--      chat_audio: audio/*, max 25MB
--      verification_photos: image/*, max 10MB
--      event_images: image/*, max 10MB
-- ----------------------------------------------------------------------------
-- These must be applied via Supabase Dashboard:
--   Storage → [bucket] → Configuration
--   Or via the Management API
-- ----------------------------------------------------------------------------
