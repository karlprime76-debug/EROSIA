-- ============================================================
-- Erosia - Consolidated SQL Schema (all migrations)
-- Generated: 2026-07-12 17:05:26
-- Run this entire script in Supabase Studio SQL Editor
-- ============================================================

-- >>> schema.sql
-- Erosia Database Schema

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT CHECK (age >= 18),
  bio TEXT,
  occupation TEXT,
  location TEXT,
  photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  looking_for TEXT DEFAULT 'friendship' CHECK (looking_for IN ('friendship', 'casual', 'fwb', 'serious', 'open')),
  mood TEXT DEFAULT 'discuter' CHECK (mood IN ('discuter', 'rencontre', 'disponible_ce_soir', 'relation_serieuse', 'chill', 'de_passage')),
  energy_score INT DEFAULT 50 CHECK (energy_score BETWEEN 0 AND 100),
  trust_score INT DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Swipes
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID REFERENCES profiles(id) NOT NULL,
  swiped_id UUID REFERENCES profiles(id) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('like', 'pass', 'super_like')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own swipes"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  USING (auth.uid() = swiper_id);

CREATE POLICY "Users can delete own swipes"
  ON swipes FOR DELETE
  USING (auth.uid() = swiper_id);

CREATE POLICY "Users can delete swipes involving them"
  ON swipes FOR DELETE
  USING (auth.uid() = swiped_id);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) NOT NULL,
  user2_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  USING (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Users can delete own matches"
  ON matches FOR DELETE
  USING (auth.uid() IN (user1_id, user2_id));

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete messages in their matches"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Function to auto-create match on mutual like
CREATE OR REPLACE FUNCTION handle_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM swipes
    WHERE swiper_id = NEW.swiped_id
    AND swiped_id = NEW.swiper_id
    AND direction IN ('like', 'super_like')
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_mutual_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  WHEN (NEW.direction IN ('like', 'super_like'))
  EXECUTE FUNCTION handle_mutual_like();

-- Flirts (winks / œillades)
CREATE TABLE flirts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE flirts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send flirts"
  ON flirts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view flirts they sent or received"
  ON flirts FOR SELECT
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can delete own flirts"
  ON flirts FOR DELETE
  USING (auth.uid() = sender_id);

-- Blocks
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES profiles(id) NOT NULL,
  blocked_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  reported_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Add last_seen to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Add a function to update last_seen on auth activity
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_seen = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> schema_v2.sql
-- Erosia Schema v2 - Colonnes manquantes sur profiles
-- À exécuter après schema.sql
-- Ajoute toutes les colonnes utilisées par le code mais jamais créées

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_remaining INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_likes_reset_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_incognito ON profiles(incognito);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;


-- >>> schema_v2_fix_existing.sql
-- Fixer les NULL sur les profils existants après schema_v2
UPDATE profiles SET incognito = false WHERE incognito IS NULL;
UPDATE profiles SET super_likes_remaining = 1 WHERE super_likes_remaining IS NULL;
UPDATE profiles SET is_admin = false WHERE is_admin IS NULL;


-- >>> schema_v3.sql
-- Erosia Schema v3 - Premium, Selfie, Stories, Travel, Reactions, Notifications, Icebreakers
-- Run this after schema_v2.sql

-- ==============================
-- Part 1: Profiles new columns
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_active BOOLEAN DEFAULT false;

-- ==============================
-- Part 2: Subscription prices
-- ==============================
CREATE TABLE IF NOT EXISTS subscription_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_id TEXT NOT NULL UNIQUE,
  amount INT NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month'
);

ALTER TABLE subscription_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view subscription prices" ON subscription_prices;
CREATE POLICY "Everyone can view subscription prices"
  ON subscription_prices FOR SELECT
  USING (true);

-- ==============================
-- Part 3: Verification requests
-- ==============================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own verification requests" ON verification_requests;
CREATE POLICY "Users can insert own verification requests"
  ON verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
CREATE POLICY "Users can view own verification requests"
  ON verification_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can view all verification requests" ON verification_requests;
CREATE POLICY "Service role can view all verification requests"
  ON verification_requests FOR SELECT
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update verification requests" ON verification_requests;
CREATE POLICY "Service role can update verification requests"
  ON verification_requests FOR UPDATE
  USING (auth.role() = 'service_role');

-- Auto-verify profile when verification is approved
CREATE OR REPLACE FUNCTION handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles SET is_verified = true WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_verification_approval ON verification_requests;
CREATE TRIGGER on_verification_approval
  AFTER UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_verification_approval();

-- ==============================
-- Part 4: Icebreakers
-- ==============================
CREATE TABLE IF NOT EXISTS icebreakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT
);

ALTER TABLE icebreakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view icebreakers" ON icebreakers;
CREATE POLICY "Everyone can view icebreakers"
  ON icebreakers FOR SELECT
  USING (true);

-- Seed icebreakers (French)
INSERT INTO icebreakers (question, category) VALUES
  ('Quel est ton endroit préféré pour voyager ?', 'voyage'),
  ('Quel genre de musique écoutes-tu en boucle en ce moment ?', 'musique'),
  ('Si tu pouvais dîner avec une personne célèbre, qui choisirais-tu ?', 'culture'),
  ('Quelle est la chose la plus spontanée que tu aies faite ?', 'aventure'),
  ('Plutôt café ou thé ? Et comment le prends-tu ?', 'quotidien'),
  ('Quel est ton film ou ta série préférée ?', 'culture'),
  ('Quel est ton hobby le plus inattendu ?', 'loisirs'),
  ('Si tu gagnais au loto, quelle serait la première chose que tu ferais ?', 'rêves'),
  ('Quel est le meilleur conseil que tu aies reçu ?', 'vie'),
  ('Quelle destination rêves-tu de visiter ?', 'voyage'),
  ('Plutôt soirée chill à la maison ou sortie entre amis ?', 'social'),
  ('Quel est ton plat préféré ?', 'gastronomie'),
  ('Quel est le dernier livre que tu as lu ?', 'lecture'),
  ('Quel sport ou activité physique pratiques-tu ?', 'sport')
ON CONFLICT DO NOTHING;

-- ==============================
-- Part 5: Stories (24h ephemeral)
-- ==============================
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
CREATE POLICY "Users can insert own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

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
  );

-- Cleanup expired stories function
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS int4 AS $$
DECLARE
  deleted_count int4;
BEGIN
  DELETE FROM stories WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- Part 6: Travel mode
-- ==============================
-- Columns already added on profiles (Part 1)

-- ==============================
-- Part 7: Message reactions
-- ==============================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their matches" ON message_reactions;
CREATE POLICY "Users can view reactions in their matches"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN matches ON matches.id = messages.match_id
      WHERE messages.id = message_reactions.message_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own reactions" ON message_reactions;
CREATE POLICY "Users can insert own reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages
      JOIN matches ON matches.id = messages.match_id
      WHERE messages.id = message_reactions.message_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- Part 8: Notifications
-- ==============================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match', 'flirt', 'message', 'super_like', 'verification')),
  actor_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification triggers

-- On match insert -> notify both users
CREATE OR REPLACE FUNCTION notify_match()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, metadata) VALUES
    (NEW.user1_id, 'match', NEW.user2_id, jsonb_build_object('match_id', NEW.id)),
    (NEW.user2_id, 'match', NEW.user1_id, jsonb_build_object('match_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_notification ON matches;
CREATE TRIGGER on_match_notification
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match();

-- On flirt insert -> notify receiver
CREATE OR REPLACE FUNCTION notify_flirt()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (NEW.receiver_id, 'flirt', NEW.sender_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_flirt_notification ON flirts;
CREATE TRIGGER on_flirt_notification
  AFTER INSERT ON flirts
  FOR EACH ROW
  EXECUTE FUNCTION notify_flirt();

-- On message insert -> notify the other user in the match
CREATE OR REPLACE FUNCTION notify_message()
RETURNS TRIGGER AS $$
DECLARE
  other_user_id UUID;
BEGIN
  SELECT CASE
    WHEN matches.user1_id = NEW.sender_id THEN matches.user2_id
    ELSE matches.user1_id
  END INTO other_user_id
  FROM matches WHERE matches.id = NEW.match_id;

  INSERT INTO notifications (user_id, type, actor_id, metadata)
  VALUES (other_user_id, 'message', NEW.sender_id, jsonb_build_object('match_id', NEW.match_id, 'message_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_notification ON messages;
CREATE TRIGGER on_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message();

-- ==============================
-- Webhook dedup table
-- ==============================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only — webhook_events" ON webhook_events;
CREATE POLICY "Service role only — webhook_events"
  ON webhook_events
  USING (false);


-- >>> schema_v4.sql
-- Erosia Schema v4 - Audio, Video Profile, Moderation, Events, Duels, Date Ideas, Ephemeral Chat, Gift Store
-- Run this after schema_v3.sql

-- ==============================
-- 1. Audio messages
-- ==============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Note: Create storage bucket 'chat_audio' via Supabase dashboard / API

-- ==============================
-- 2. Video profile
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Note: Create storage bucket 'profile_videos' via Supabase dashboard / API

-- ==============================
-- 3. Moderation IA
-- ==============================
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('message', 'photo', 'audio', 'video')),
  content_id UUID,
  content_text TEXT,
  content_url TEXT,
  flagged BOOLEAN DEFAULT false,
  reason TEXT,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage moderation_queue" ON moderation_queue;
CREATE POLICY "Admins can manage moderation_queue"
  ON moderation_queue FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can insert into moderation_queue" ON moderation_queue;
CREATE POLICY "Users can insert into moderation_queue"
  ON moderation_queue FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION flag_content(
  p_content_type TEXT,
  p_content_id UUID,
  p_content_text TEXT DEFAULT NULL,
  p_content_url TEXT DEFAULT NULL
)
RETURNS moderation_queue AS $$
DECLARE
  result moderation_queue;
BEGIN
  INSERT INTO moderation_queue (content_type, content_id, content_text, content_url, flagged, reason)
  VALUES (p_content_type, p_content_id, p_content_text, p_content_url, true, 'flagged by user')
  RETURNING * INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_moderate_message(message_text TEXT)
RETURNS boolean AS $$
DECLARE
  banned_words TEXT[] := ARRAY['spam', 'scam', 'http://', 'https://', 'viagra', 'casino'];
  word TEXT;
BEGIN
  FOREACH word IN ARRAY banned_words
  LOOP
    IF position(lower(word) in lower(message_text)) > 0 THEN
      INSERT INTO moderation_queue (content_type, content_text, flagged, reason)
      VALUES ('message', message_text, true, 'auto-flagged: contains banned word "' || word || '"');
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 4. Events / Antennes
-- ==============================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude float8,
  longitude float8,
  event_date TIMESTAMPTZ,
  max_participants INT,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('date_night', 'meetup', 'party', 'other')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view events" ON events;
CREATE POLICY "Everyone can view events"
  ON events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own events" ON events;
CREATE POLICY "Creators can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own events" ON events;
CREATE POLICY "Creators can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
CREATE POLICY "Users can view event participants"
  ON event_participants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join events" ON event_participants;
CREATE POLICY "Users can join events"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own participation" ON event_participants;
CREATE POLICY "Users can update own participation"
  ON event_participants FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave events" ON event_participants;
CREATE POLICY "Users can leave events"
  ON event_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- 5. Mode duel
-- ==============================
CREATE TABLE IF NOT EXISTS duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  profile_a_id UUID NOT NULL REFERENCES profiles(id),
  profile_b_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view duels" ON duels;
CREATE POLICY "Everyone can view duels"
  ON duels FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create duels" ON duels;
CREATE POLICY "Authenticated users can create duels"
  ON duels FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS duel_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id),
  chosen_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(duel_id, voter_id)
);

ALTER TABLE duel_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view duel votes" ON duel_votes;
CREATE POLICY "Everyone can view duel votes"
  ON duel_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON duel_votes;
CREATE POLICY "Authenticated users can vote"
  ON duel_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- ==============================
-- 6. Date ideas / Liste de souhaits
-- ==============================
CREATE TABLE IF NOT EXISTS date_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea TEXT NOT NULL,
  emoji TEXT DEFAULT '💝',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE date_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view date ideas" ON date_ideas;
CREATE POLICY "Everyone can view date ideas"
  ON date_ideas FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS user_date_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES date_ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, idea_id)
);

ALTER TABLE user_date_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own date ideas" ON user_date_ideas;
CREATE POLICY "Users can view own date ideas"
  ON user_date_ideas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own date ideas" ON user_date_ideas;
CREATE POLICY "Users can insert own date ideas"
  ON user_date_ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own date ideas" ON user_date_ideas;
CREATE POLICY "Users can delete own date ideas"
  ON user_date_ideas FOR DELETE
  USING (auth.uid() = user_id);

-- Seed 15+ date ideas in French
INSERT INTO date_ideas (idea, emoji, category) VALUES
  ('Pique-nique au parc', '🧺', 'outdoor'),
  ('Dîner aux chandelles', '🕯️', 'romance'),
  ('Cinéma en plein air', '🎬', 'outdoor'),
  ('Balade en vélo', '🚲', 'sport'),
  ('Visite d''un musée', '🏛️', 'culture'),
  ('Dégustation de vins', '🍷', 'gastronomie'),
  ('Escape game', '🔐', 'aventure'),
  ('Cours de cuisine', '👨‍🍳', 'gastronomie'),
  ('Concert ou festival', '🎵', 'culture'),
  ('Randonnée en montagne', '⛰️', 'outdoor'),
  ('Soirée jeux de société', '🎲', 'fun'),
  ('Patinoire ou ski', '⛸️', 'sport'),
  ('Aquarium ou zoo', '🐠', 'culture'),
  ('Spa et bien-être', '💆', 'relaxation'),
  ('Bowling', '🎳', 'fun'),
  ('Karaoké', '🎤', 'fun'),
  ('Brunch dominical', '🥂', 'gastronomie'),
  ('Atelier poterie ou peinture', '🎨', 'culture'),
  ('Road trip improvisé', '🚗', 'aventure'),
  ('Star gazing / observation des étoiles', '⭐', 'romance')
ON CONFLICT DO NOTHING;

-- ==============================
-- 7. Ephemeral chat
-- ==============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ephemeral BOOLEAN DEFAULT false;

CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS int4 AS $$
DECLARE
  deleted_count int4;
BEGIN
  DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 8. Gift store
-- ==============================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  price_cents INT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view gifts" ON gifts;
CREATE POLICY "Everyone can view gifts"
  ON gifts FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS sent_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES gifts(id),
  match_id UUID REFERENCES matches(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sent gifts they are involved in" ON sent_gifts;
CREATE POLICY "Users can view sent gifts they are involved in"
  ON sent_gifts FOR SELECT
  USING (auth.uid() IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "Users can send gifts" ON sent_gifts;
CREATE POLICY "Users can send gifts"
  ON sent_gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Seed 10+ gifts
INSERT INTO gifts (name, emoji, price_cents) VALUES
  ('Rose rouge', '🌹', 199),
  ('Champagne', '🍾', 499),
  ('Chocolats fins', '🍫', 299),
  ('Bouquet de fleurs', '💐', 399),
  ('Peluche ours', '🧸', 249),
  ('Bague de cœur', '💍', 999),
  ('Parfum', '🧴', 599),
  ('Ballon cœur', '🎈', 99),
  ('Petit mot doux', '💌', 49),
  ('Coffret cadeau surprise', '🎁', 799),
  ('Nuit à l''hôtel', '🏨', 1999),
  ('Brunch pour deux', '🥐', 899)
ON CONFLICT DO NOTHING;


-- >>> schema_v5.sql
-- Erosia Schema v5 - Visio-Chat, Quiz Profile, Read Receipts, Ghost Mode, Icebreaker AI, Streaks, Shared Playlist, Daily Profile
-- Run this after schema_v4.sql

-- ==============================
-- 1. Visio-Chat (video calls)
-- ==============================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES profiles(id) NOT NULL,
  callee_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ringing', 'connected', 'ended', 'missed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calls they are part of" ON calls;
CREATE POLICY "Users can view calls they are part of"
  ON calls FOR SELECT
  USING (auth.uid() IN (caller_id, callee_id));

DROP POLICY IF EXISTS "Users can insert calls they are part of" ON calls;
CREATE POLICY "Users can insert calls they are part of"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can update calls they are part of" ON calls;
CREATE POLICY "Users can update calls they are part of"
  ON calls FOR UPDATE
  USING (auth.uid() IN (caller_id, callee_id));

-- ==============================
-- 2. Quiz visible sur le profil
-- ==============================

CREATE OR REPLACE FUNCTION get_user_top_traits(p_user_id UUID)
RETURNS TABLE(trait TEXT, count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT trait_counts.trait, trait_counts.cnt
  FROM (
    SELECT
      (qq.options->qa.answer_index->>'trait')::TEXT AS trait,
      COUNT(*)::INT AS cnt
    FROM quiz_answers qa
    JOIN quiz_questions qq ON qa.question_id = qq.id
    WHERE qa.user_id = p_user_id
      AND qq.options IS NOT NULL
      AND jsonb_typeof(qq.options) = 'array'
      AND qa.answer_index < jsonb_array_length(qq.options)
    GROUP BY (qq.options->qa.answer_index->>'trait')
    ORDER BY cnt DESC
    LIMIT 3
  ) trait_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_profile_quiz_summary(p_user_id UUID)
RETURNS TABLE(question TEXT, answer TEXT, trait TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qq.question,
    (qq.options->qa.answer_index->>'text')::TEXT AS answer,
    (qq.options->qa.answer_index->>'trait')::TEXT AS trait
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qa.question_id = qq.id
  WHERE qa.user_id = p_user_id
    AND qq.options IS NOT NULL
    AND jsonb_typeof(qq.options) = 'array'
    AND qa.answer_index < jsonb_array_length(qq.options)
  ORDER BY qq.category, qq.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 3. Accusés de lecture (read receipts)
-- ==============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION mark_messages_read(p_match_id UUID, p_reader_id UUID)
RETURNS INT4 AS $$
DECLARE
  updated_count INT4;
BEGIN
  UPDATE messages
  SET read_at = now()
  WHERE match_id = p_match_id
    AND sender_id != p_reader_id
    AND read_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  UPDATE matches
  SET read_count = COALESCE(read_count, 0) + updated_count
  WHERE id = p_match_id;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_count(p_match_id UUID, p_user_id UUID)
RETURNS INT4 AS $$
DECLARE
  unread INT4;
BEGIN
  SELECT COUNT(*)::INT4 INTO unread
  FROM messages
  WHERE match_id = p_match_id
    AND sender_id != p_user_id
    AND read_at IS NULL;

  RETURN unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 4. Mode hors ligne / fantôme (ghost mode)
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- ==============================
-- 5. Icebreaker IA
-- ==============================
CREATE TABLE IF NOT EXISTS icebreaker_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  target_id UUID REFERENCES profiles(id) NOT NULL,
  suggestion TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE icebreaker_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can view own icebreaker suggestions"
  ON icebreaker_suggestions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can insert own icebreaker suggestions"
  ON icebreaker_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can update own icebreaker suggestions"
  ON icebreaker_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own icebreaker suggestions" ON icebreaker_suggestions;
CREATE POLICY "Users can delete own icebreaker suggestions"
  ON icebreaker_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION generate_icebreaker(p_user_id UUID, p_target_id UUID)
RETURNS TEXT AS $$
DECLARE
  target_interests TEXT[];
  target_bio TEXT;
  suggestion TEXT;
  template INT;
  interest_count INT;
BEGIN
  SELECT interests, bio INTO target_interests, target_bio
  FROM profiles WHERE id = p_target_id;

  IF target_interests IS NULL OR array_length(target_interests, 1) = 0 THEN
    RETURN 'Qu''est-ce qui t''a donné envie de rejoindre Erosia ?';
  END IF;

  interest_count := array_length(target_interests, 1);
  template := (floor(random() * 5) + 1)::INT;

  CASE template
    WHEN 1 THEN suggestion := 'J''ai vu que tu aimes ' || target_interests[1] || ', c''est génial ! Comment as-tu découvert cette passion ?';
    WHEN 2 THEN suggestion := 'Puisque tu es fan de ' || target_interests[1] || ', quel est ton meilleur souvenir lié à ça ?';
    WHEN 3 THEN suggestion := 'Je vois que tu aimes ' || target_interests[1] || ', c''est aussi un de mes centres d''intérêt ! Qu''est-ce qui te plaît le plus là-dedans ?';
    WHEN 4 THEN suggestion := 'Tu as ' || target_interests[1] || ' dans tes centres d''intérêt ! Si tu devais recommander ça à quelqu''un, par quoi commencerais-tu ?';
    WHEN 5 THEN suggestion := 'Parlons de ' || target_interests[1] || ' ! Quelle est la chose la plus cool que tu aies faite récemment en rapport avec ça ?';
  END CASE;

  INSERT INTO icebreaker_suggestions (user_id, target_id, suggestion)
  VALUES (p_user_id, p_target_id, suggestion);

  RETURN suggestion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 6. Streaks (consecutive days chatting)
-- ==============================
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON streaks;
CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own streak" ON streaks;
CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON streaks;
CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
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
        WHEN streaks.last_message_date = CURRENT_DATE THEN streaks.current_streak
        ELSE 1
      END
    ),
    last_message_date = CURRENT_DATE,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_streak ON messages;
CREATE TRIGGER on_message_streak
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_streak();

CREATE OR REPLACE FUNCTION check_streaks()
RETURNS INT4 AS $$
DECLARE
  reset_count INT4;
BEGIN
  UPDATE streaks
  SET current_streak = 0
  WHERE last_message_date < CURRENT_DATE - 1
    AND current_streak > 0;

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- 7. Playlist partagée (shared playlist)
-- ==============================
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT,
  platform TEXT DEFAULT 'spotify' CHECK (platform IN ('spotify', 'youtube', 'deezer', 'other')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view playlist items in their matches" ON playlist_items;
CREATE POLICY "Users can view playlist items in their matches"
  ON playlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = playlist_items.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert playlist items in their matches" ON playlist_items;
CREATE POLICY "Users can insert playlist items in their matches"
  ON playlist_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = playlist_items.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own playlist items" ON playlist_items;
CREATE POLICY "Users can delete own playlist items"
  ON playlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- 8. Profil du jour (daily featured profile)
-- ==============================
CREATE TABLE IF NOT EXISTS daily_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view daily profiles" ON daily_profiles;
CREATE POLICY "All authenticated users can view daily profiles"
  ON daily_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can insert daily profiles" ON daily_profiles;
CREATE POLICY "Service role can insert daily profiles"
  ON daily_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION select_daily_profile()
RETURNS UUID AS $$
DECLARE
  chosen_id UUID;
  today_date DATE := CURRENT_DATE;
BEGIN
  SELECT profile_id INTO chosen_id
  FROM daily_profiles
  WHERE date = today_date;

  IF found THEN
    RETURN chosen_id;
  END IF;

  SELECT id INTO chosen_id
  FROM profiles
  WHERE incognito = false
    AND ghost_mode = false
  ORDER BY random()
  LIMIT 1;

  INSERT INTO daily_profiles (profile_id, date)
  VALUES (chosen_id, today_date);

  RETURN chosen_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> schema_v6_push.sql
-- Ensure notifications table exists (from schema_v3)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match', 'flirt', 'message', 'super_like', 'verification')),
  actor_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function: send_push_on_notification
-- Triggered when a new notification is inserted, sends push via our API
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
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_push ON notifications;
CREATE TRIGGER on_notification_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();


-- >>> schema_v7_payment_accounts.sql
-- Payment accounts for gift shop
CREATE TABLE IF NOT EXISTS payment_accounts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mobile_money', 'card')),
  phone TEXT,
  country TEXT,
  operator TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own payment account" ON payment_accounts;
CREATE POLICY "Users can manage own payment account"
  ON payment_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- >>> schema_v8_social_space.sql
-- Erosia Schema v8 - Social Space 3D mode
-- Run this after schema_v7_payment_accounts.sql

-- ==============================
-- 1. social_spaces (predefined 3D environments)
-- ==============================
CREATE TABLE IF NOT EXISTS social_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('beach', 'rooftop', 'lounge', 'garden', 'coffee')),
  description TEXT,
  capacity INT DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view social_spaces" ON social_spaces;
CREATE POLICY "All authenticated can view social_spaces"
  ON social_spaces FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==============================
-- 2. space_presence (users currently in spaces)
-- ==============================
CREATE TABLE IF NOT EXISTS space_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES social_spaces(id) ON DELETE CASCADE NOT NULL,
  x DOUBLE PRECISION DEFAULT 0,
  y DOUBLE PRECISION DEFAULT 0,
  z DOUBLE PRECISION DEFAULT 0,
  rotation_y DOUBLE PRECISION DEFAULT 0,
  animation TEXT DEFAULT 'idle' CHECK (animation IN ('idle', 'walking', 'standing', 'sitting', 'dancing', 'waving')),
  entered_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_presence_space_id ON space_presence(space_id);
CREATE INDEX IF NOT EXISTS idx_space_presence_user_id ON space_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_space_presence_active ON space_presence(last_active_at);

ALTER TABLE space_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view space_presence" ON space_presence;
CREATE POLICY "All authenticated can view space_presence"
  ON space_presence FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own presence" ON space_presence;
CREATE POLICY "Users can insert own presence"
  ON space_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presence" ON space_presence;
CREATE POLICY "Users can update own presence"
  ON space_presence FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presence" ON space_presence;
CREATE POLICY "Users can delete own presence"
  ON space_presence FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================
-- 3. Seed default spaces
-- ==============================
INSERT INTO social_spaces (name, type, description, capacity, metadata) VALUES
  ('Plage Paradis', 'beach', 'Une plage virtuelle au coucher du soleil avec vue sur l''océan', 80, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#FF8C42",
    "sky_color": "#FF6B35",
    "ground_color": "#F4D03F",
    "water_color": "#1E90FF",
    "music": "ambient_ocean",
    "objects": ["palm_trees", "beach_chairs", "bonfire", "beach_umbrellas"]
  }'::jsonb),
  ('Rooftop Urbain', 'rooftop', 'Un rooftop chic en pleine ville avec vue panoramique', 60, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#1A1A2E",
    "sky_color": "#16213E",
    "ground_color": "#0F3460",
    "accent_color": "#E94560",
    "music": "chill_lofi",
    "objects": ["sofas", "bar", "string_lights", "city_skyline"]
  }'::jsonb),
  ('Lounge Cosy', 'lounge', 'Un salon feutré et intime avec cheminée et bibliothèque', 30, '{
    "spawn": {"x": 0, "y": 0, "z": 0},
    "ambient_color": "#2D1810",
    "wall_color": "#8B4513",
    "accent_color": "#D4A574",
    "music": "jazz_soft",
    "objects": ["fireplace", "bookshelves", "armchairs", "rug", "plants"]
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- >>> schema_v9_aura.sql
-- Erosia Schema v9 - Aura system
-- Run this after schema_v8_social_space.sql

CREATE TABLE IF NOT EXISTS aura_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level INT NOT NULL CHECK (level >= 0 AND level <= 100),
  color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  glow_intensity REAL NOT NULL CHECK (glow_intensity >= 0 AND glow_intensity <= 1),
  particle_count INT NOT NULL DEFAULT 20,
  label TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aura_snapshots_level ON aura_snapshots(level DESC);
CREATE INDEX IF NOT EXISTS idx_aura_snapshots_updated ON aura_snapshots(updated_at DESC);

ALTER TABLE aura_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view aura_snapshots" ON aura_snapshots;
CREATE POLICY "All authenticated can view aura_snapshots"
  ON aura_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own aura" ON aura_snapshots;
CREATE POLICY "Users can insert own aura"
  ON aura_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own aura" ON aura_snapshots;
CREATE POLICY "Users can update own aura"
  ON aura_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trigger_recompute_aura()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aura_snapshots (user_id, level, color, secondary_color, glow_intensity, particle_count, label, factors, updated_at)
  VALUES (NEW.id, 50, '#6B7280', '#3B82F6', 0.2, 10, 'Brouillard', '{"energy":15,"trust":12,"mood":0,"activity":0,"profile":5}'::jsonb, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_aura ON profiles;
CREATE TRIGGER on_profile_created_aura
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_aura();


-- >>> schema_v10_stories_enhanced.sql
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


-- >>> schema_v11_events.sql
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
INSERT INTO storage.buckets (id, name, public) VALUES ('event_images', 'event_images', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;

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


-- >>> schema_v12_social_rooms.sql
-- Erosia Schema v12 - Social Rooms (realtime, capacity, position)
-- Run after schema_v11_events.sql

-- ==============================
-- 1. Rooms table (5 fixed rooms)
-- ==============================
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

-- ==============================
-- 2. Room presence
-- ==============================
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

-- ==============================
-- 3. Enable realtime on room_presence
-- ==============================
ALTER PUBLICATION supabase_realtime ADD TABLE room_presence;

-- ==============================
-- 4. Seed the 5 rooms
-- ==============================
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


-- >>> schema_v13_audit_fixes.sql
-- Erosia Schema v13 - Audit Fixes: missing tables, columns, indexes, FKs, RPCs, triggers, RLS
-- Run this LAST, after schema_v12_social_rooms.sql
-- All statements use IF [NOT] EXISTS so it's safe to run multiple times

-- ==============================
-- 1. MISSING TABLES
-- ==============================

-- 1a. behavior_log (used by engine/behavior.ts, engine/activity.ts, api/engine/behavior)
CREATE TABLE IF NOT EXISTS behavior_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE behavior_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own behavior_log" ON behavior_log;
CREATE POLICY "Users can view own behavior_log"
  ON behavior_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own behavior_log" ON behavior_log;
CREATE POLICY "Users can insert own behavior_log"
  ON behavior_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1b. push_subscriptions (used by api.ts, api/push/send, api/auth/delete-account)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- 1c. quiz_questions (used by api.ts, engine/compatibility.ts RPC)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view quiz_questions" ON quiz_questions;
CREATE POLICY "Everyone can view quiz_questions"
  ON quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Service role can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (auth.role() = 'service_role');

-- Seed quiz questions
INSERT INTO quiz_questions (question, options, category) VALUES
  ('Quel est ton style de week-end idéal ?', '[{"text":"Aventure en plein air","trait":"aventurier"},{"text":"Chill à la maison","trait":"casual"},{"text":"Sortie entre amis","trait":"social"},{"text":"Culture et découvertes","trait":"curieux"}]', 'lifestyle'),
  ('Quel est ton plus grand défaut ?', '[{"text":"Trop ambitieux·se","trait":"ambitieux"},{"text":"Trop sensible","trait":"sensible"},{"text":"Trop impatient·e","trait":"spontané"},{"text":"Trop perfectionniste","trait":"exigeant"}]', 'personnalité'),
  ('Quel genre de voyage préfères-tu ?', '[{"text":"Road trip","trait":"aventurier"},{"text":"Ville culturelle","trait":"curieux"},{"text":"Plage et farniente","trait":"casual"},{"text":"Randonnée nature","trait":"aventurier"}]', 'voyage'),
  ('Comment réagis-tu face à un imprévu ?', '[{"text":"Je m''adapte facilement","trait":"flexible"},{"text":"Je planifie une solution","trait":"organisé"},{"text":"Je suis stressé·e","trait":"sensible"},{"text":"J''en profite pour improviser","trait":"spontané"}]', 'personnalité'),
  ('Quel est ton langage d''amour principal ?', '[{"text":"Les paroles valorisantes","trait":"romantique"},{"text":"Les moments de qualité","trait":"attentif"},{"text":"Les cadeaux","trait":"généreux"},{"text":"Le contact physique","trait":"passionné"}]', 'relation')
ON CONFLICT DO NOTHING;

-- 1d. quiz_answers (used by api.ts, engine/compatibility.ts RPC)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
CREATE POLICY "Users can view own quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
CREATE POLICY "Everyone can view quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own quiz answers" ON quiz_answers;
CREATE POLICY "Users can insert own quiz answers"
  ON quiz_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quiz answers" ON quiz_answers;
CREATE POLICY "Users can update own quiz answers"
  ON quiz_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- 1e. user_scores (used by engine/compatibility.ts)
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  activity_score REAL DEFAULT 0.5,
  trust_score REAL DEFAULT 0.5,
  energy_score REAL DEFAULT 0.5,
  compatibility_score REAL DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_scores" ON user_scores;
CREATE POLICY "Users can view own user_scores"
  ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
CREATE POLICY "Everyone can view user_scores"
  ON user_scores FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage user_scores" ON user_scores;
CREATE POLICY "Service role can manage user_scores"
  ON user_scores FOR ALL
  USING (auth.role() = 'service_role');

-- 1f. interest_graph (used by engine/interest-graph.ts)
CREATE TABLE IF NOT EXISTS interest_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interest_graph ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view interest_graph" ON interest_graph;
CREATE POLICY "Everyone can view interest_graph"
  ON interest_graph FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage interest_graph" ON interest_graph;
CREATE POLICY "Service role can manage interest_graph"
  ON interest_graph FOR ALL
  USING (auth.role() = 'service_role');

-- 1g. profile_interests (used by engine/interest-graph.ts)
CREATE TABLE IF NOT EXISTS profile_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES interest_graph(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, interest_id)
);

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view profile_interests" ON profile_interests;
CREATE POLICY "Everyone can view profile_interests"
  ON profile_interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own profile_interests" ON profile_interests;
CREATE POLICY "Users can manage own profile_interests"
  ON profile_interests FOR ALL
  USING (auth.uid() = profile_id);

-- ==============================
-- 2. MISSING COLUMNS
-- ==============================

-- 2a. sent_gifts columns (needed for payment tracking)
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS amount_paid INT;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS fee_cents INT DEFAULT 0;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- 2b. moderation_queue status column
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- 2c. notifications type: add 'gift'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('match', 'flirt', 'message', 'super_like', 'verification', 'gift'));

-- ==============================
-- 3. MISSING INDEXES
-- ==============================

-- Performance-critical indexes on queried columns
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON swipes(swiper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON swipes(swiped_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_behavior_log_user ON behavior_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_action ON behavior_log(action);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON quiz_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_user ON user_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender ON sent_gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_receiver ON sent_gifts(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flirts_receiver ON flirts(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- ==============================
-- 4. MISSING CASCADE DELETES ON FKs
-- ==============================

-- Drop and recreate FK constraints to add ON DELETE CASCADE
-- This prevents orphaned rows when a profile is deleted

DO $$ BEGIN
  -- swipes
  ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_fkey;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_id_fkey FOREIGN KEY (swiper_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiped_id_fkey;
  ALTER TABLE swipes ADD CONSTRAINT swipes_swiped_id_fkey FOREIGN KEY (swiped_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user1_id_fkey;
  ALTER TABLE matches ADD CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user2_id_fkey;
  ALTER TABLE matches ADD CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
  ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE flirts DROP CONSTRAINT IF EXISTS flirts_sender_id_fkey;
  ALTER TABLE flirts ADD CONSTRAINT flirts_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE flirts DROP CONSTRAINT IF EXISTS flirts_receiver_id_fkey;
  ALTER TABLE flirts ADD CONSTRAINT flirts_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
  ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
  ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
  ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;
  ALTER TABLE reports ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================
-- 5. MISSING RPC: get_compatibility
-- ==============================

DROP FUNCTION IF EXISTS get_compatibility(uuid,uuid);
CREATE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS REAL AS $$
DECLARE
  score REAL;
  age_factor REAL;
  distance_factor REAL;
  interest_factor REAL;
  looking_factor REAL;
  user_a RECORD;
  user_b RECORD;
  lat1 DOUBLE PRECISION;
  lng1 DOUBLE PRECISION;
  lat2 DOUBLE PRECISION;
  lng2 DOUBLE PRECISION;
  dist DOUBLE PRECISION;
  user_interests TEXT[];
  target_interests TEXT[];
  shared_count INT;
  union_count INT;
BEGIN
  SELECT age, latitude, longitude, looking_for, interests INTO user_a
  FROM profiles WHERE id = user_a_id;
  SELECT age, latitude, longitude, looking_for, interests INTO user_b
  FROM profiles WHERE id = user_b_id;

  IF user_a.id IS NULL OR user_b.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Age factor (15%)
  IF user_a.age IS NOT NULL AND user_b.age IS NOT NULL THEN
    age_factor := GREATEST(0, 1 - ABS(user_a.age - user_b.age) / 50.0);
  ELSE
    age_factor := 0.5;
  END IF;

  -- Distance factor (20%)
  lat1 := user_a.latitude; lng1 := user_a.longitude;
  lat2 := user_b.latitude; lng2 := user_b.longitude;
  IF lat1 IS NOT NULL AND lng1 IS NOT NULL AND lat2 IS NOT NULL AND lng2 IS NOT NULL THEN
    dist := 6371 * 2 * ASIN(LEAST(1, SQRT(
      SIN((lat2 - lat1) * PI() / 360)^2 +
      COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
      SIN((lng2 - lng1) * PI() / 360)^2
    )));
    distance_factor := GREATEST(0, 1 - LEAST(dist, 500) / 500.0);
  ELSE
    distance_factor := 0.5;
  END IF;

  -- Interest factor (25%)
  user_interests := COALESCE(user_a.interests, '{}');
  target_interests := COALESCE(user_b.interests, '{}');
  IF array_length(user_interests, 1) > 0 AND array_length(target_interests, 1) > 0 THEN
    SELECT COUNT(*) INTO shared_count
    FROM (
      SELECT unnest(user_interests)
      INTERSECT
      SELECT unnest(target_interests)
    ) s;
    SELECT COUNT(DISTINCT u) INTO union_count
    FROM (
      SELECT unnest(user_interests) AS u
      UNION
      SELECT unnest(target_interests)
    ) s;
    interest_factor := CASE WHEN union_count > 0 THEN shared_count::REAL / union_count ELSE 0 END;
  ELSE
    interest_factor := 0.5;
  END IF;

  -- Looking for factor (15%)
  IF user_a.looking_for IS NOT NULL AND user_b.looking_for IS NOT NULL THEN
    IF user_a.looking_for = user_b.looking_for THEN
      looking_factor := 1.0;
    ELSE
      looking_factor := 0.5;
    END IF;
  ELSE
    looking_factor := 0.5;
  END IF;

  -- Composite: weights = age:15%, distance:20%, interests:25%, looking:15%, language:5%, personality:15%, activity:5%
  score := age_factor * 0.15 + distance_factor * 0.20 + interest_factor * 0.25 + looking_factor * 0.15 + 0.05;

  RETURN ROUND(score::REAL, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 6. MISSING FUNCTION & TRIGGER: update_last_seen
-- ==============================

CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_seen = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_active ON auth.users;
CREATE TRIGGER on_auth_user_active
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- ==============================
-- 7. MISSING RLS POLICIES
--    (all guarded by table existence checks)
-- ==============================

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'duels' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Creators can update own duels" ON duels;
    CREATE POLICY "Creators can update own duels"
      ON duels FOR UPDATE
      USING (auth.uid() = creator_id);

    DROP POLICY IF EXISTS "Creators can delete own duels" ON duels;
    CREATE POLICY "Creators can delete own duels"
      ON duels FOR DELETE
      USING (auth.uid() = creator_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'duel_votes' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can update own duel votes" ON duel_votes;
    CREATE POLICY "Users can update own duel votes"
      ON duel_votes FOR UPDATE
      USING (auth.uid() = voter_id);

    DROP POLICY IF EXISTS "Users can delete own duel votes" ON duel_votes;
    CREATE POLICY "Users can delete own duel votes"
      ON duel_votes FOR DELETE
      USING (auth.uid() = voter_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'calls' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can delete own calls" ON calls;
    CREATE POLICY "Users can delete own calls"
      ON calls FOR DELETE
      USING (auth.uid() IN (caller_id, callee_id));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'playlist_items' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can update own playlist items" ON playlist_items;
    CREATE POLICY "Users can update own playlist items"
      ON playlist_items FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'streaks' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can delete own streak" ON streaks;
    CREATE POLICY "Users can delete own streak"
      ON streaks FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'daily_profiles' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Service role can update daily_profiles" ON daily_profiles;
    CREATE POLICY "Service role can update daily_profiles"
      ON daily_profiles FOR UPDATE
      USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Service role can delete daily_profiles" ON daily_profiles;
    CREATE POLICY "Service role can delete daily_profiles"
      ON daily_profiles FOR DELETE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'gift_transactions' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Service role can update gift_transactions" ON gift_transactions;
    CREATE POLICY "Service role can update gift_transactions"
      ON gift_transactions FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ==============================
-- 8. ENABLE REALTIME FOR KEY TABLES
-- ==============================

-- Guarded by table existence checks to avoid 42P01
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'room_presence' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE room_presence;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'space_presence' AND schemaname = 'public') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE space_presence;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================
-- 9. STORAGE BUCKETS (ensure all exist)
-- ==============================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('photos', 'photos', true),
  ('stories', 'stories', true),
  ('profile_videos', 'profile_videos', true),
  ('chat_photos', 'chat_photos', true),
  ('chat_audio', 'chat_audio', true),
  ('verification_photos', 'verification_photos', true),
  ('event_images', 'event_images', true)
ON CONFLICT (id) DO NOTHING;


-- >>> schema_v14_rate_limit.sql
-- Erosia Schema v14 - Rate Limiting DB Store
-- Run this in Supabase SQL Editor to enable shared rate limiting across serverless instances

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Index pour accélérer le nettoyage des entrées expirées
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- RLS: restriction d'accès aux tables système uniquement
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Pas de politique select/insert/update publique, seul le role service_role/authentifié via des fonctions security definer peut l'exécuter
DROP POLICY IF EXISTS "Service role managed" ON rate_limits;
CREATE POLICY "Service role managed" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Fonction RPC d'incrémentation avec nettoyage automatique
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_ms INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_reset_at TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Nettoyage des anciennes limites expirées
  DELETE FROM rate_limits WHERE reset_at < v_now;

  SELECT count, reset_at INTO v_count, v_reset_at
  FROM rate_limits
  WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval);
    RETURN TRUE;
  ELSIF v_now > v_reset_at THEN
    UPDATE rate_limits
    SET count = 1, reset_at = v_now + (p_window_ms || ' milliseconds')::interval
    WHERE key = p_key;
    RETURN TRUE;
  ELSIF v_count >= p_max_requests THEN
    RETURN FALSE;
  ELSE
    UPDATE rate_limits
    SET count = count + 1
    WHERE key = p_key;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> storage_complete.sql
-- Storage buckets + policies (photos, stories, chat, verification, video)

-- 1. Photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() = owner);

-- 2. Stories
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public read stories" ON storage.objects;
CREATE POLICY "Public read stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "Auth upload stories" ON storage.objects;
CREATE POLICY "Auth upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users update own stories" ON storage.objects;
CREATE POLICY "Users update own stories" ON storage.objects FOR UPDATE USING (bucket_id = 'stories' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users delete own stories" ON storage.objects;
CREATE POLICY "Users delete own stories" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid() = owner);

-- 3. Profile videos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_videos', 'profile_videos', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
CREATE POLICY "Public read videos" ON storage.objects FOR SELECT USING (bucket_id = 'profile_videos');
DROP POLICY IF EXISTS "Auth upload videos" ON storage.objects;
CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile_videos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users update own videos" ON storage.objects;
CREATE POLICY "Users update own videos" ON storage.objects FOR UPDATE USING (bucket_id = 'profile_videos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users delete own videos" ON storage.objects;
CREATE POLICY "Users delete own videos" ON storage.objects FOR DELETE USING (bucket_id = 'profile_videos' AND auth.uid() = owner);

-- 4. Chat photos
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_photos', 'chat_photos', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Chat photos public read" ON storage.objects;
CREATE POLICY "Chat photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat_photos');
DROP POLICY IF EXISTS "Auth upload chat photos" ON storage.objects;
CREATE POLICY "Auth upload chat photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_photos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Chat photos owner update" ON storage.objects;
CREATE POLICY "Chat photos owner update" ON storage.objects FOR UPDATE USING (bucket_id = 'chat_photos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Chat photos owner delete" ON storage.objects;
CREATE POLICY "Chat photos owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'chat_photos' AND auth.uid() = owner);

-- 5. Chat audio
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_audio', 'chat_audio', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public read audio" ON storage.objects;
CREATE POLICY "Public read audio" ON storage.objects FOR SELECT USING (bucket_id = 'chat_audio');
DROP POLICY IF EXISTS "Auth upload audio" ON storage.objects;
CREATE POLICY "Auth upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_audio' AND auth.role() = 'authenticated');

-- 6. Verification photos
INSERT INTO storage.buckets (id, name, public) VALUES ('verification_photos', 'verification_photos', true) ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;
DROP POLICY IF EXISTS "Public read verification" ON storage.objects;
CREATE POLICY "Public read verification" ON storage.objects FOR SELECT USING (bucket_id = 'verification_photos');
DROP POLICY IF EXISTS "Auth upload verification" ON storage.objects;
CREATE POLICY "Auth upload verification" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification_photos' AND auth.role() = 'authenticated');


-- >>> migration_gift_wallet.sql
-- Gift wallet: transactions pour solde et retraits
CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gift_received', 'payout')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  sent_gift_id UUID REFERENCES sent_gifts(id) ON DELETE SET NULL,
  payment_details TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON gift_transactions;
CREATE POLICY "Users can view own transactions"
  ON gift_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON gift_transactions;
CREATE POLICY "Users can insert own transactions"
  ON gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_user ON gift_transactions(user_id, created_at DESC);


-- >>> migration_starter_pack.sql
-- Starter pack : nouvelle colonne onboarding_complete
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;


-- >>> migration_v15_missing_tables.sql
-- Erosia Schema v15 — Tables/RPCs manquants (safe à ré-exécuter)
-- Copie-colle dans Supabase SQL Editor → Run

-- ==============================
-- 1. Colonne onboarding_complete
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete) WHERE onboarding_complete = true;

-- ==============================
-- 2. user_scores (engine/compatibility)
-- ==============================
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  activity_score REAL DEFAULT 0.5,
  trust_score REAL DEFAULT 0.5,
  energy_score REAL DEFAULT 0.5,
  compatibility_score REAL DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_scores" ON user_scores;
CREATE POLICY "Users can view own user_scores"
  ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
CREATE POLICY "Everyone can view user_scores"
  ON user_scores FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage user_scores" ON user_scores;
CREATE POLICY "Service role can manage user_scores"
  ON user_scores FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_user_scores_user ON user_scores(user_id);

-- ==============================
-- 3. quiz_questions + seed data
-- ==============================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view quiz_questions" ON quiz_questions;
CREATE POLICY "Everyone can view quiz_questions"
  ON quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Service role can manage quiz_questions"
  ON quiz_questions FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO quiz_questions (question, options, category) VALUES
  ('Quel est ton style de week-end idéal ?', '[{"text":"Aventure en plein air","trait":"aventurier"},{"text":"Chill à la maison","trait":"casual"},{"text":"Sortie entre amis","trait":"social"},{"text":"Culture et découvertes","trait":"curieux"}]', 'lifestyle'),
  ('Quel est ton plus grand défaut ?', '[{"text":"Trop ambitieux·se","trait":"ambitieux"},{"text":"Trop sensible","trait":"sensible"},{"text":"Trop impatient·e","trait":"spontané"},{"text":"Trop perfectionniste","trait":"exigeant"}]', 'personnalité'),
  ('Quel genre de voyage préfères-tu ?', '[{"text":"Road trip","trait":"aventurier"},{"text":"Ville culturelle","trait":"curieux"},{"text":"Plage et farniente","trait":"casual"},{"text":"Randonnée nature","trait":"aventurier"}]', 'voyage'),
  ('Comment réagis-tu face à un imprévu ?', '[{"text":"Je m''adapte facilement","trait":"flexible"},{"text":"Je planifie une solution","trait":"organisé"},{"text":"Je suis stressé·e","trait":"sensible"},{"text":"J''en profite pour improviser","trait":"spontané"}]', 'personnalité'),
  ('Quel est ton langage d''amour principal ?', '[{"text":"Les paroles valorisantes","trait":"romantique"},{"text":"Les moments de qualité","trait":"attentif"},{"text":"Les cadeaux","trait":"généreux"},{"text":"Le contact physique","trait":"passionné"}]', 'relation')
ON CONFLICT DO NOTHING;

-- ==============================
-- 4. quiz_answers
-- ==============================
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
CREATE POLICY "Users can view own quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
CREATE POLICY "Everyone can view quiz answers"
  ON quiz_answers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own quiz answers" ON quiz_answers;
CREATE POLICY "Users can insert own quiz answers"
  ON quiz_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quiz answers" ON quiz_answers;
CREATE POLICY "Users can update own quiz answers"
  ON quiz_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON quiz_answers(user_id);

-- ==============================
-- 5. get_user_top_traits RPC
-- ==============================
CREATE OR REPLACE FUNCTION get_user_top_traits(p_user_id UUID)
RETURNS TABLE(trait TEXT, count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT trait_counts.trait, trait_counts.cnt
  FROM (
    SELECT
      (qq.options->qa.answer_index->>'trait')::TEXT AS trait,
      COUNT(*)::INT AS cnt
    FROM quiz_answers qa
    JOIN quiz_questions qq ON qa.question_id = qq.id
    WHERE qa.user_id = p_user_id
      AND qq.options IS NOT NULL
      AND jsonb_typeof(qq.options) = 'array'
      AND qa.answer_index < jsonb_array_length(qq.options)
    GROUP BY (qq.options->qa.answer_index->>'trait')
    ORDER BY cnt DESC
    LIMIT 3
  ) trait_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================
-- 6. streaks table + trigger
-- ==============================
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON streaks;
CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own streak" ON streaks;
CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON streaks;
CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
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
        WHEN streaks.last_message_date = CURRENT_DATE THEN streaks.current_streak
        ELSE 1
      END
    ),
    last_message_date = CURRENT_DATE,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_streak ON messages;
CREATE TRIGGER on_message_streak
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_streak();

-- ==============================
-- 7. aura_snapshots (si pas déjà créé)
-- ==============================
CREATE TABLE IF NOT EXISTS aura_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level INT NOT NULL CHECK (level >= 0 AND level <= 100),
  color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  glow_intensity REAL NOT NULL CHECK (glow_intensity >= 0 AND glow_intensity <= 1),
  particle_count INT NOT NULL DEFAULT 20,
  label TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE aura_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view aura_snapshots" ON aura_snapshots;
CREATE POLICY "All authenticated can view aura_snapshots"
  ON aura_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own aura" ON aura_snapshots;
CREATE POLICY "Users can insert own aura"
  ON aura_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own aura" ON aura_snapshots;
CREATE POLICY "Users can update own aura"
  ON aura_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trigger_recompute_aura()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aura_snapshots (user_id, level, color, secondary_color, glow_intensity, particle_count, label, factors, updated_at)
  VALUES (NEW.id, 50, '#6B7280', '#3B82F6', 0.2, 10, 'Brouillard', '{"energy":15,"trust":12,"mood":0,"activity":0,"profile":5}'::jsonb, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_aura ON profiles;
CREATE TRIGGER on_profile_created_aura
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_aura();


-- >>> migration_v16_privacy_mode.sql
-- Erosia Schema v16 — Privacy Mode
-- Safe à ré-exécuter (IF NOT EXISTS / OR REPLACE)

-- ==============================
-- 0. profile_visible column on profiles (for efficient query filtering)
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_profiles_profile_visible ON profiles(profile_visible) WHERE profile_visible = true;

-- ==============================
-- 1. privacy_settings table
-- ==============================
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visible BOOLEAN NOT NULL DEFAULT true,
  visible_to_compatible_only BOOLEAN NOT NULL DEFAULT false,
  hide_exact_age BOOLEAN NOT NULL DEFAULT false,
  hide_exact_distance BOOLEAN NOT NULL DEFAULT false,
  blur_photos BOOLEAN NOT NULL DEFAULT false,
  first_message_permission TEXT NOT NULL DEFAULT 'everyone'
    CHECK (first_message_permission IN ('everyone','matches','verified_only','nobody')),
  story_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (story_visibility IN ('everyone','matches','nobody')),
  online_status_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (online_status_visibility IN ('everyone','matches','nobody')),
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  auto_block_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can view own privacy_settings"
  ON privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can insert own privacy_settings"
  ON privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own privacy_settings" ON privacy_settings;
CREATE POLICY "Users can update own privacy_settings"
  ON privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can SELECT privacy_settings for checks" ON privacy_settings;
CREATE POLICY "Authenticated can SELECT privacy_settings for checks"
  ON privacy_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==============================
-- 2. Auto-create privacy_settings on profile creation
-- ==============================
CREATE OR REPLACE FUNCTION trigger_create_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_privacy ON profiles;
CREATE TRIGGER on_profile_created_privacy
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_privacy_settings();

-- Sync profile_visible from privacy_settings to profiles
CREATE OR REPLACE FUNCTION sync_profile_visible()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET profile_visible = NEW.profile_visible WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_privacy_update_sync_profile ON privacy_settings;
CREATE TRIGGER on_privacy_update_sync_profile
  AFTER INSERT OR UPDATE OF profile_visible ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_visible();


-- >>> migration_v17_safety.sql
-- Migration v17: Consent & Safety

-- 1. consent_log: journal des actions de consentement
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_action ON consent_log(action_type);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at DESC);

-- 2. blocked_users: blocages utilisateur
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- 3. reports: signalements
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- 4. safety_tips: conseils de sécurité
CREATE TABLE IF NOT EXISTS safety_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed safety tips
INSERT INTO safety_tips (category, icon, title, content, priority) VALUES
  ('dating', 'Heart', 'Rencontres dans un lieu public', 'Pour les premiers rendez-vous, privilégie toujours un endroit public et fréquenté. Préviens un ami ou un proche du lieu et de l heure de ton rendez-vous.', 10),
  ('dating', 'User', 'Ne partage pas tes coordonnées trop vite', 'Prends le temps de connaître la personne avant de partager ton numéro de téléphone, ton adresse ou tes réseaux sociaux. Utilise la messagerie Erosia.', 0),
  ('privacy', 'Shield', 'Protège tes photos', 'Évite d envoyer des photos intimes ou compromettantes. Une fois partagées, tu perds le contrôle sur leur diffusion.', 0),
  ('privacy', 'Lock', 'Vérifie tes paramètres de confidentialité', 'Rends-toi régulièrement dans tes paramètres de confidentialité pour vérifier qui peut voir ton profil, ta localisation et ton statut en ligne.', 0),
  ('security', 'Eye', 'Signale les comportements suspects', 'Si quelqu un te met mal à l aise, te demande de l argent ou insiste après un refus, signale-le immédiatement depuis la conversation.', 0),
  ('security', 'Shield', 'Ne réponds pas aux demandes d argent', 'Erosia ne demande jamais d argent en dehors des abonnements Premium officiels. Méfie-toi des demandes de virement, carte cadeau ou aide financière.', 0),
  ('consent', 'Heart', 'Le consentement est essentiel', 'Chaque interaction doit être basée sur un consentement mutuel et enthousiaste. Tu peux retirer ton consentement à tout moment, sans justification.', 0),
  ('consent', 'MessageCircle', 'Communique tes limites', 'Sois clair·e sur tes limites et attentes dès le début. Une personne qui les respecte est une personne de confiance.', 0),
  ('dating', 'Sun', 'Écoute ton intuition', 'Si quelque chose te semble étrange ou trop beau pour être vrai, écoute ton instinct. Tu peux mettre fin à une conversation ou bloquer un utilisateur à tout moment.', 0)
ON CONFLICT DO NOTHING;

-- Ensure RLS
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_tips ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- consent_log: user can insert own, select own
CREATE POLICY consent_log_insert ON consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY consent_log_select ON consent_log FOR SELECT USING (auth.uid() = user_id);

-- blocked_users: user can manage own blocks
CREATE POLICY blocked_users_insert ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY blocked_users_select ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY blocked_users_delete ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- reports: user can insert own reports
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- safety_tips: everyone can read
CREATE POLICY safety_tips_select ON safety_tips FOR SELECT USING (true);

-- RPC to check if user is blocked
CREATE OR REPLACE FUNCTION is_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2);
$$;

-- RPC to get blocked user ids
CREATE OR REPLACE FUNCTION get_blocked_ids(blocker_id UUID)
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT blocked_id FROM blocked_users WHERE blocker_id = $1;
$$;


-- >>> migration_v18_gift_catalog_seed.sql
-- Migration v18: Gift catalog seed
-- Inserts a complete catalog of gifts for the boutique

INSERT INTO gifts (name, emoji, price_cents, image_url) VALUES
  -- Petits cadeaux (< 1000 F)
  ('Cœur virtuel', '💜', 150, NULL),
  ('Rose rouge', '🌹', 300, NULL),
  ('Bisou volant', '💋', 200, NULL),
  ('Sticker mignon', '✨', 100, NULL),
  ('Fleur de cerisier', '🌸', 250, NULL),
  ('Cœur qui bat', '💓', 180, NULL),
  ('Petit nuage', '☁️', 120, NULL),
  ('Étoile filante', '⭐', 220, NULL),
  ('Papillon', '🦋', 280, NULL),

  -- Cadeaux moyens (1000 - 5000 F)
  ('Boîte de chocolats', '🍫', 1500, NULL),
  ('Bouquet de fleurs', '💐', 2000, NULL),
  ('Parfum', '🧴', 3500, NULL),
  ('Peluche ours', '🧸', 2500, NULL),
  ('Bague', '💍', 4500, NULL),
  ('Collier', '📿', 3000, NULL),
  ('Montre', '⌚', 4000, NULL),
  ('Livre', '📖', 1500, NULL),
  ('Vin', '🍷', 2200, NULL),
  ('Gâteau', '🎂', 1800, NULL),
  ('Bougies', '🕯️', 800, NULL),
  ('Porte-bonheur', '🍀', 600, NULL),
  ('Masque de beauté', '🧖', 1200, NULL),
  ('Bijoux de cheveux', '💎', 900, NULL),

  -- Grands cadeaux (5000 - 15000 F)
  ('Sac à main', '👛', 8000, NULL),
  ('Chaussures', '👠', 10000, NULL),
  ('Veste', '🧥', 12000, NULL),
  ('Casque audio', '🎧', 7000, NULL),
  ('Montre connectée', '⌚', 15000, NULL),
  ('Parfum de luxe', '🌺', 9000, NULL),
  ('Coffret cadeau', '🎁', 6000, NULL),
  ('Abonnement Premium', '👑', 5000, NULL),

  -- Expériences
  ('Dîner aux chandelles', '🕯️', 10000, NULL),
  ('Cinéma à deux', '🎬', 4000, NULL),
  ('Week-end surprise', '🏖️', 25000, NULL),
  ('Spa journée', '💆', 15000, NULL),
  ('Concert', '🎵', 8000, NULL),
  ('Cours de cuisine', '👨‍🍳', 6000, NULL),
  ('Escape game', '🧩', 5000, NULL),

  -- Cadeaux virtuels
  ('Badge Super Fan', '🏆', 500, NULL),
  ('Cadre photo', '🖼️', 700, NULL),
  ('Carte virtuelle', '💌', 200, NULL),
  ('Super Like', '🔥', 1000, NULL)
ON CONFLICT DO NOTHING;


-- >>> migration_v19_create_auth_user.sql
-- Migration v19: Create auth user via SECURITY DEFINER
-- Contourne le service GoTrue (en panne 2026-07) en écrivant directement
-- dans auth.users/auth.identities avec une fonction run as superuser.
-- Appliquer dans Supabase SQL Editor.
-- Usage depuis le code : SELECT public.create_auth_user('email', 'password');

-- Colonne manquante pour le trigger on_auth_user_active
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction de vérification de mot de passe (contourne GoTrue)
CREATE OR REPLACE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_stored = crypt(p_password, v_stored) THEN
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Récupère l'ID d'un utilisateur par email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Met à jour le mot de passe d'un utilisateur (hash bcrypt)
CREATE OR REPLACE FUNCTION public.update_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_hashed TEXT;
BEGIN
  v_hashed := crypt(p_password, gen_salt('bf', 10));
  UPDATE auth.users
  SET encrypted_password = v_hashed, updated_at = NOW()
  WHERE email = p_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- >>> migration_v21_fix_privacy_rls.sql
-- Migration v21: Fix privacy_settings RLS - replace permissive policy with security definer function

-- Drop the overly permissive policy that allows ANY authenticated user to SELECT all rows
DROP POLICY IF EXISTS "Authenticated can SELECT privacy_settings for checks" ON privacy_settings;

-- Create security definer function for cross-user privacy checks
-- This function returns only the fields needed by the application
-- and uses SECURITY DEFINER to bypass RLS safely
CREATE OR REPLACE FUNCTION public.get_privacy_check_data(target_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  story_visibility text,
  first_message_permission text,
  read_receipts boolean,
  visible_to_compatible_only boolean,
  online_status_visibility boolean
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    ps.story_visibility,
    ps.first_message_permission,
    ps.read_receipts,
    ps.visible_to_compatible_only,
    ps.online_status_visibility
  FROM public.privacy_settings ps
  WHERE ps.user_id = ANY(target_user_ids);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_privacy_check_data(uuid[]) TO authenticated;


-- >>> migration_v22_get_compatibility_rpc.sql
-- Migration v22: Add missing get_compatibility RPC function
-- This function was defined in schema_v13_audit_fixes.sql but never deployed

DROP FUNCTION IF EXISTS get_compatibility(uuid,uuid);

CREATE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS REAL AS $$
DECLARE
  score REAL;
  age_factor REAL;
  distance_factor REAL;
  interest_factor REAL;
  looking_factor REAL;
  user_a RECORD;
  user_b RECORD;
  lat1 DOUBLE PRECISION;
  lng1 DOUBLE PRECISION;
  lat2 DOUBLE PRECISION;
  lng2 DOUBLE PRECISION;
  dist DOUBLE PRECISION;
  user_interests TEXT[];
  target_interests TEXT[];
  shared_count INT;
  union_count INT;
BEGIN
  SELECT age, latitude, longitude, looking_for, interests INTO user_a
  FROM profiles WHERE id = user_a_id;
  SELECT age, latitude, longitude, looking_for, interests INTO user_b
  FROM profiles WHERE id = user_b_id;

  IF user_a.id IS NULL OR user_b.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Age factor (15%)
  IF user_a.age IS NOT NULL AND user_b.age IS NOT NULL THEN
    age_factor := GREATEST(0, 1 - ABS(user_a.age - user_b.age) / 50.0);
  ELSE
    age_factor := 0.5;
  END IF;

  -- Distance factor (20%)
  lat1 := user_a.latitude; lng1 := user_a.longitude;
  lat2 := user_b.latitude; lng2 := user_b.longitude;
  IF lat1 IS NOT NULL AND lng1 IS NOT NULL AND lat2 IS NOT NULL AND lng2 IS NOT NULL THEN
    dist := 6371 * 2 * ASIN(LEAST(1, SQRT(
      SIN((lat2 - lat1) * PI() / 360)^2 +
      COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
      SIN((lng2 - lng1) * PI() / 360)^2
    )));
    distance_factor := GREATEST(0, 1 - LEAST(dist, 500) / 500.0);
  ELSE
    distance_factor := 0.5;
  END IF;

  -- Interest factor (25%)
  user_interests := COALESCE(user_a.interests, '{}');
  target_interests := COALESCE(user_b.interests, '{}');
  IF array_length(user_interests, 1) > 0 AND array_length(target_interests, 1) > 0 THEN
    SELECT COUNT(*) INTO shared_count
    FROM (
      SELECT unnest(user_interests)
      INTERSECT
      SELECT unnest(target_interests)
    ) s;
    SELECT COUNT(DISTINCT u) INTO union_count
    FROM (
      SELECT unnest(user_interests) AS u
      UNION
      SELECT unnest(target_interests)
    ) s;
    interest_factor := CASE WHEN union_count > 0 THEN shared_count::REAL / union_count ELSE 0 END;
  ELSE
    interest_factor := 0.5;
  END IF;

  -- Looking for factor (15%)
  IF user_a.looking_for IS NOT NULL AND user_b.looking_for IS NOT NULL THEN
    IF user_a.looking_for = user_b.looking_for THEN
      looking_factor := 1.0;
    ELSE
      looking_factor := 0.5;
    END IF;
  ELSE
    looking_factor := 0.5;
  END IF;

  -- Composite: weights = age:15%, distance:20%, interests:25%, looking:15%, language:5%, personality:15%, activity:5%
  score := age_factor * 0.15 + distance_factor * 0.20 + interest_factor * 0.25 + looking_factor * 0.15 + 0.05;

  RETURN ROUND(score::REAL, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_compatibility(uuid,uuid) TO authenticated;


-- >>> migration_v23_fix_push_notification.sql
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


-- >>> migration_v24_realtime_messages.sql
-- Migration v24: Fix Realtime message delivery
-- Ensures messages table is in the supabase_realtime publication
-- and has proper RLS policies for Realtime delivery

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END;
$$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
CREATE POLICY "Users can view messages in their matches"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );


-- >>> migration_v25_match_race_atomic.sql
-- Fix race condition in handle_mutual_like() using advisory lock
-- Prevents concurrent swipes by both users from missing each other

CREATE OR REPLACE FUNCTION handle_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  pair_id BIGINT;
BEGIN
  pair_id := hashtext(
    LEAST(NEW.swiper_id::text, NEW.swiped_id::text)
    || '_' ||
    GREATEST(NEW.swiper_id::text, NEW.swiped_id::text)
  );
  PERFORM pg_advisory_xact_lock(pair_id);

  IF EXISTS (
    SELECT 1 FROM swipes
    WHERE swiper_id = NEW.swiped_id
    AND swiped_id = NEW.swiper_id
    AND direction IN ('like', 'super_like')
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic delete_match RPC
-- Wraps swipes/messages/match deletion in a single transaction

CREATE OR REPLACE FUNCTION delete_match(match_id UUID, requesting_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_row RECORD;
  other_id UUID;
BEGIN
  SELECT * INTO match_row FROM matches WHERE id = match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Match introuvable');
  END IF;

  IF match_row.user1_id <> requesting_user_id AND match_row.user2_id <> requesting_user_id THEN
    RETURN jsonb_build_object('error', 'Non autorisé');
  END IF;

  other_id := CASE WHEN match_row.user1_id = requesting_user_id THEN match_row.user2_id ELSE match_row.user1_id END;

  DELETE FROM swipes
  WHERE (swiper_id = requesting_user_id AND swiped_id = other_id)
     OR (swiper_id = other_id AND swiped_id = requesting_user_id);

  DELETE FROM messages WHERE messages.match_id = delete_match.match_id;
  DELETE FROM matches WHERE matches.id = delete_match.match_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_match TO authenticated;


-- >>> migration_v26_notifications_fixes.sql
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


-- >>> migration_v27_referrals_fixes.sql
-- Migration v27: Referrals fixes — constraints, RLS, RPC atomiques, multi-cycle

-- 1. Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles (referral_code);

-- 2. UNIQUE constraints
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

UPDATE referrals SET referred_id = gen_random_uuid() WHERE referred_id IS NULL;
ALTER TABLE referrals ALTER COLUMN referred_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 3. RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select_own ON referrals;
DROP POLICY IF EXISTS referrals_insert_referred ON referrals;

CREATE POLICY referrals_select_own ON referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY referrals_insert_referred ON referrals
  FOR INSERT
  WITH CHECK (referred_id = auth.uid());

-- 4. RPC: apply_referral_code (atomic, replay protection via UNIQUE)
CREATE OR REPLACE FUNCTION apply_referral_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = p_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code invalide');
  END IF;
  IF v_referrer_id = p_user_id THEN
    RETURN jsonb_build_object('error', 'Auto-parrainage non autorisé');
  END IF;
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, p_user_id, 'joined');
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Code déjà utilisé');
END;
$$;

-- 5. RPC: redeem_referral_reward (atomic, advisory lock, exactly 5 at a time)
CREATE OR REPLACE FUNCTION redeem_referral_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('redeem_' || p_user_id::text));

  SELECT count(*) INTO v_count
  FROM referrals
  WHERE referrer_id = p_user_id
    AND status = 'joined'
    AND NOT reward_granted;

  IF v_count < 5 THEN
    RETURN jsonb_build_object('error', '5 filleuls requis');
  END IF;

  SELECT premium_expires_at INTO v_current_expiry
  FROM profiles WHERE id = p_user_id;

  v_new_expiry := greatest(coalesce(v_current_expiry, now()), now()) + interval '30 days';

  UPDATE profiles
  SET subscription_tier = 'premium',
      premium_expires_at = v_new_expiry
  WHERE id = p_user_id;

  UPDATE referrals
  SET reward_granted = true
  WHERE ctid IN (
    SELECT ctid FROM referrals
    WHERE referrer_id = p_user_id
      AND status = 'joined'
      AND NOT reward_granted
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  );

  RETURN jsonb_build_object('success', true, 'premium_expires_at', v_new_expiry);
END;
$$;


-- >>> migration_v28_gift_checkout_rls.sql
-- Migration v28: Gift checkout validation + RLS gift_transactions

-- 1. RLS : seuls les paiements sortants (payout) sont autorisés en INSERT
--    (gift_received est inséré par le webhook via service_role, qui bypass RLS)
DROP POLICY IF EXISTS "Users can insert own transactions" ON gift_transactions;

CREATE POLICY "Users can insert payouts"
  ON gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND type = 'payout');

-- 2. Index pour la validation des matches côté API
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);


-- >>> migration_v29_batch_spark_score.sql
-- Migration v29: Batch spark score RPC — élimine le N+1 du moteur de recommandation

CREATE OR REPLACE FUNCTION batch_spark_score(p_user_id UUID, p_target_ids UUID[])
RETURNS TABLE(target_id UUID, score NUMERIC, explanation TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_age INT;
  v_my_lat DOUBLE PRECISION;
  v_my_lng DOUBLE PRECISION;
  v_my_looking_for TEXT;
  v_my_mood TEXT;
  v_my_interests TEXT[];
  v_my_last_active TIMESTAMPTZ;
BEGIN
  -- Profil utilisateur courant
  SELECT age, latitude, longitude, looking_for, mood, interests, last_active_at
    INTO v_my_age, v_my_lat, v_my_lng, v_my_looking_for, v_my_mood, v_my_interests, v_my_last_active
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY
  WITH
    targets AS (
      SELECT id, age, latitude, longitude, looking_for, mood, interests, last_active_at, is_verified
      FROM profiles WHERE id = ANY(p_target_ids)
    ),
    interest_overlap AS (
      SELECT t.id AS target_id, COUNT(*)::INT AS shared
      FROM targets t
      JOIN profiles p ON p.id = p_user_id
      JOIN LATERAL (
        SELECT unnest(p.interests) AS i
        INTERSECT
        SELECT unnest(t.interests) AS i
      ) overlap ON true
      GROUP BY t.id
    ),
    report_counts AS (
      SELECT target_id, COUNT(*)::INT AS cnt
      FROM reports WHERE target_id = ANY(p_target_ids)
      GROUP BY target_id
    )
  SELECT
    t.id,
    ROUND((
      -- Mood compat (10%)
      CASE
        WHEN v_my_mood = t.mood THEN 0.10
        WHEN (v_my_mood = 'discuter' AND t.mood IN ('chill', 'de_passage'))
          OR (v_my_mood = 'rencontre' AND t.mood IN ('disponible_ce_soir', 'relation_serieuse'))
          OR (v_my_mood = 'disponible_ce_soir' AND t.mood IN ('rencontre', 'relation_serieuse'))
          OR (v_my_mood = 'relation_serieuse' AND t.mood IN ('rencontre', 'discuter'))
          OR (v_my_mood = 'chill' AND t.mood IN ('discuter', 'de_passage'))
          OR (v_my_mood = 'de_passage' AND t.mood IN ('discuter', 'chill'))
        THEN 0.07
        ELSE 0.03
      END
      +
      -- Looking-for compat (10%)
      CASE
        WHEN v_my_looking_for = t.looking_for THEN 0.10
        WHEN (v_my_looking_for = 'serious' AND t.looking_for IN ('fwb', 'open'))
          OR (v_my_looking_for = 'fwb' AND t.looking_for IN ('serious', 'casual', 'open'))
          OR (v_my_looking_for = 'casual' AND t.looking_for IN ('fwb', 'open'))
          OR (v_my_looking_for = 'open' AND t.looking_for IN ('serious', 'fwb', 'casual'))
          OR (v_my_looking_for = 'friendship' AND t.looking_for IN ('casual', 'open'))
        THEN 0.07
        ELSE 0.02
      END
      +
      -- Age compat (15% * 0.20 weight in compat = 3% of total)
      CASE WHEN v_my_age IS NOT NULL AND t.age IS NOT NULL
        THEN GREATEST(0, (1 - ABS(v_my_age - t.age)::NUMERIC / 50)) * 0.03
        ELSE 0
      END
      +
      -- Proximity (5%)
      CASE WHEN v_my_lat IS NOT NULL AND v_my_lng IS NOT NULL
                AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL
        THEN GREATEST(0, 1 - LEAST(
          (6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(t.latitude - v_my_lat) / 2), 2)
            + COS(RADIANS(v_my_lat)) * COS(RADIANS(t.latitude))
            * POWER(SIN(RADIANS(t.longitude - v_my_lng) / 2), 2)
          )))::NUMERIC / 100, 1
        )) * 0.05
        ELSE 0.025
      END
      +
      -- Interest overlap (5%)
      COALESCE(
        (SELECT LEAST(io.shared::NUMERIC / 10, 1) * 0.05
         FROM interest_overlap io WHERE io.target_id = t.id),
        0
      )
      +
      -- Activity recency (5%)
      CASE
        WHEN t.last_active_at IS NULL THEN 0.01
        WHEN t.last_active_at >= NOW() - INTERVAL '1 day' THEN 0.05
        WHEN t.last_active_at >= NOW() - INTERVAL '3 days' THEN 0.045
        WHEN t.last_active_at >= NOW() - INTERVAL '7 days' THEN 0.035
        WHEN t.last_active_at >= NOW() - INTERVAL '14 days' THEN 0.025
        WHEN t.last_active_at >= NOW() - INTERVAL '30 days' THEN 0.015
        ELSE 0.005
      END
      +
      -- Trust bonus (8%): verified + no reports
      CASE
        WHEN t.is_verified AND (COALESCE((SELECT rc.cnt FROM report_counts rc WHERE rc.target_id = t.id), 0) = 0) THEN 0.08
        WHEN t.is_verified THEN 0.04
        ELSE 0.02
      END
    ), 4) AS score,
    ''::TEXT AS explanation
  FROM targets t;

END;
$$;

GRANT EXECUTE ON FUNCTION batch_spark_score(UUID, UUID[]) TO authenticated;


-- >>> migration_v30_stories_rls_fixes.sql
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


-- >>> migration_v31_fix_gotrue_signup.sql
-- Migration v31 — Fix GoTrue signup 500
-- Problème : le trigger par défaut sur auth.users (on_auth_user_created)
-- référence profiles sans SET search_path = public, ce qui fait 500 sur signup.
-- L'app crée déjà les profils via createProfile() dans la route register,
-- donc ce trigger est non seulement cassé mais redondant.

-- 1. Drop le trigger (quel que soit son nom)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_active ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 2. Drop la fonction associée (quel que soit son nom)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS auth.handle_new_user();
DROP FUNCTION IF EXISTS extensions.handle_new_user();


-- >>> migration_v32_chat_media_fixes.sql
-- Migration v32 — Chat media fixes
-- Ajoute les colonnes manquantes, corrige les RLS, sécurise le storage,
-- et gère les photos à vue unique (view_once).

-- 1. Colonnes manquantes sur messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_preview TEXT;

-- 2. DELETE RLS : tout participant du match peut supprimer un message
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in their matches" ON messages;
CREATE POLICY "Users can delete messages in their matches" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- 3. Fonction helper pour vérifier qu'un utilisateur participe à un match
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_user_id UUID, p_object_name TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Le nom de l'objet suit le pattern {bucket_prefix}/{matchId}/...
  -- ex: "chat_audio/abc-123/file.webm" ou "chat/abc-123/file.jpg"
  v_match_id := split_part(p_object_name, '/', 2)::UUID;
  RETURN EXISTS (
    SELECT 1 FROM matches
    WHERE id = v_match_id
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  );
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 4. Politiques storage pour chat_audio
DROP POLICY IF EXISTS "Public read audio" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Match participants can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;

CREATE POLICY "Match participants can read audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat_audio'
    AND (auth.role() = 'service_role' OR is_chat_participant(auth.uid(), name))
  );

CREATE POLICY "Auth upload audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_audio'
    AND auth.role() = 'authenticated'
    AND is_chat_participant(auth.uid(), name)
  );

CREATE POLICY "Users can update own audio" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

-- 5. Politiques storage pour chat_photos
DROP POLICY IF EXISTS "Chat photos public read" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload chat photos" ON storage.objects;
DROP POLICY IF EXISTS "Match participants can read photos" ON storage.objects;

CREATE POLICY "Match participants can read photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat_photos'
    AND (auth.role() = 'service_role' OR is_chat_participant(auth.uid(), name))
  );

CREATE POLICY "Auth upload chat photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_photos'
    AND auth.role() = 'authenticated'
    AND is_chat_participant(auth.uid(), name)
  );

-- 6. Trigger : à la lecture d'un message view_once, efface l'image
CREATE OR REPLACE FUNCTION public.handle_view_once_read()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.view_once = true AND NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    NEW.image_url = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_view_once_read ON messages;
CREATE TRIGGER trg_view_once_read
  BEFORE UPDATE OF read_at ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_view_once_read();

-- 7. Amélioration de cleanup_expired_messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS int4
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int4;
BEGIN
  DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- >>> migration_v33_gender_preferences.sql
-- Migration v33 — Gender & preferences

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non_binary'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interested_in TEXT[] DEFAULT '{}';


-- >>> migration_v34_kyc_fixes.sql
-- Migration v34 — KYC verification system fixes

-- 1. Fix verification_requests table
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS didit_session_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS didit_verification_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE verification_requests ALTER COLUMN photo_url DROP NOT NULL;

-- Relax status check to include all Didit statuses
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'manual_review', 'unknown'));

-- 2. Add verification columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none'
  CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected', 'expired', 'manual_review'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS didit_verification_id TEXT;

-- 3. Index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_verification_requests_didit_session ON verification_requests(didit_session_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);


-- >>> migration_v35_storage_security.sql
-- Migration v35 — Storage & RLS security fixes

-- 1. verification_photos: restrict read/write to owner only
DROP POLICY IF EXISTS "Anyone can view verification_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification photos" ON storage.objects;

CREATE POLICY "Users can view own verification photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own verification photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. quiz_answers: restrict to own answers
DROP POLICY IF EXISTS "Everyone can view quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
CREATE POLICY "Users can view own quiz answers" ON quiz_answers FOR SELECT
  USING (auth.uid() = user_id);

-- 3. user_scores: restrict to own scores
DROP POLICY IF EXISTS "Everyone can view user_scores" ON user_scores;
DROP POLICY IF EXISTS "Users can view own scores" ON user_scores;
CREATE POLICY "Users can view own scores" ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

-- 4. profile_interests: keep public read (needed by compatibility engine)
-- RLS already allows SELECT for all authenticated users via "Everyone can view profile_interests"

-- 5. Add GIN index for interested_in array queries
CREATE INDEX IF NOT EXISTS idx_profiles_interested_in ON profiles USING GIN (interested_in);


-- >>> migration_v36_audit_fixes.sql
-- Migration v36 — Audit fixes batch
-- H5: Fix create_auth_user search_path (extensions,public → public)
-- H6: view_once — delete storage object after read
-- H4: Consolidate duplicate reports table
-- M6: Add last_seen trigger for new users
-- M4: Fix is_chat_participant split_part fragility

-- ═══════════════════════════════════════════════
-- H5: Fix create_auth_user/verify_password search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users
  WHERE email = p_email;
  IF NOT FOUND OR v_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_stored = crypt(p_password, v_stored) THEN RETURN v_user_id; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashed TEXT;
BEGIN
  v_hashed := crypt(p_password, gen_salt('bf', 10));
  UPDATE auth.users SET encrypted_password = v_hashed, updated_at = NOW() WHERE email = p_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- H6: view_once — also delete storage object
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_view_once_read()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_object_path TEXT;
BEGIN
  IF NEW.view_once = true AND NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    IF NEW.image_url IS NOT NULL THEN
      v_object_path := substring(NEW.image_url from '/chat_photos/(.+)$');
      IF v_object_path IS NOT NULL THEN
        PERFORM storage.objects.delete('chat_photos', v_object_path);
      END IF;
    END IF;
    NEW.image_url = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- H4: Consolidate reports — ensure single table
-- schema.sql has simple CREATE TABLE, migration_v17_safety has extra columns
-- Already CREATE TABLE IF NOT EXISTS, just ensure latest columns exist
-- ═══════════════════════════════════════════════
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════
-- M6: Update last_seen for new users
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_last_seen()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET last_seen = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_last_seen ON auth.users;
CREATE TRIGGER trg_set_last_seen
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_last_seen();

-- ═══════════════════════════════════════════════
-- M4: Fix is_chat_participant — use consistent path matching
-- Replace split_part with regex for robustness
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_chat_participant(storage_path TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_id_from_path UUID;
  participant1 UUID;
  participant2 UUID;
BEGIN
  -- Extract match ID from path: chat/{matchId}/{timestamp}_{userId}_{filename}
  match_id_from_path := substring(storage_path from '^chat/([^/]+)/')::UUID;
  IF match_id_from_path IS NULL THEN RETURN false; END IF;
  SELECT user1_id, user2_id INTO participant1, participant2
  FROM matches WHERE id = match_id_from_path;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN (participant1 = p_user_id OR participant2 = p_user_id);
END;
$$;


-- >>> migration_v37_kyc_audit.sql
-- Migration v37 — KYC audit fixes
-- F28: Add CHECK constraint on verification_requests status (already done in v34, ensure it exists)
-- F26: Fix rejection_reason — only set when status = 'rejected'
-- F29: Trigger to auto-update profiles when verification_requests changes
-- F30: Clean up old verification requests on retry
-- F31: webhook_events table for atomic dedup
-- F4: Function for atomic dedup

-- ═══════════════════════════════════════════════
-- F31: webhook_events table for atomic dedup
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'didit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);

-- ═══════════════════════════════════════════════
-- F4: Atomic dedup function — returns true if first time
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.try_claim_webhook_event(p_event_id TEXT, p_source TEXT DEFAULT 'didit')
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO webhook_events (event_id, source)
  VALUES (p_event_id, p_source)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- ═══════════════════════════════════════════════
-- F10: Transactional update — updates verification_requests + profiles atomically
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_verification_update(
  p_request_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_didit_verification_id TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verification_requests
  SET
    status = p_status,
    didit_verification_id = COALESCE(p_didit_verification_id, didit_verification_id),
    verified_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_request_id;

  UPDATE profiles
  SET
    verification_status = p_status,
    is_verified = (p_status = 'approved'),
    verified_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    didit_verification_id = CASE WHEN p_status = 'approved' THEN COALESCE(p_didit_verification_id, didit_verification_id) ELSE NULL END
  WHERE id = p_user_id;
END;
$$;

-- ═══════════════════════════════════════════════
-- F30: Clean up old rejected/expired requests on new session
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.archive_old_verification_requests()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verification_requests
  SET status = 'archived'
  WHERE user_id = NEW.user_id
    AND status IN ('rejected', 'expired', 'unknown', 'manual_review')
    AND id != NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_old_verifications ON verification_requests;
CREATE TRIGGER trg_archive_old_verifications
  AFTER INSERT ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_old_verification_requests();

-- ═══════════════════════════════════════════════
-- F26: Ensure rejection_reason only set on 'rejected'
-- (handled in app logic, but add DB-level enforcement)
-- ═══════════════════════════════════════════════
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS chk_rejection_reason_only_rejected;
ALTER TABLE verification_requests ADD CONSTRAINT chk_rejection_reason_only_rejected
  CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL) OR
    (status != 'rejected' AND rejection_reason IS NULL)
  );

-- Add 'archived' to allowed statuses
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'manual_review', 'unknown', 'archived'));


-- >>> migration_v38_register_fixes.sql
-- Migration v38 — Registration fixes
-- F1/F2: Transactional RPC that creates auth user + profile atomically
-- F6: Email verification — remove auto-confirm, require email verification
-- F7: DB-level CHECK age >= 18

-- ═══════════════════════════════════════════════
-- F1/F2: Atomic registration — creates auth user, identity, and profile in one transaction
-- Handles duplicate email gracefully with meaningful error
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_age INTEGER,
  p_gender TEXT,
  p_interested_in TEXT[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
  v_existing_id UUID;
BEGIN
  -- Check if email already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Cet email est déjà utilisé');
  END IF;

  -- Validate age
  IF p_age < 18 OR p_age > 120 THEN
    RETURN jsonb_build_object('error', 'Âge invalide');
  END IF;

  -- Create auth user
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NULL, NULL,  -- email NOT auto-confirmed
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );

  -- Create identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  -- Create profile
  INSERT INTO public.profiles (
    id, name, age, gender, interested_in, photos, interests,
    verification_status, is_verified, onboarding_complete
  ) VALUES (
    v_user_id, p_name, p_age, p_gender, p_interested_in, ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    'none', false, false
  );

  RETURN jsonb_build_object('user_id', v_user_id::TEXT);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- F7: DB-level age constraint
-- ═══════════════════════════════════════════════
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_age_min;
ALTER TABLE profiles ADD CONSTRAINT chk_age_min CHECK (age >= 18 OR age IS NULL);

-- ═══════════════════════════════════════════════
-- F6: Drop auto-confirm from old RPC (if it still exists)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NULL, NULL,  -- email NOT auto-confirmed
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;


-- >>> migration_v39_comprehensive_fix.sql
-- Migration v39 — Audit fixes: REVOKE EXECUTE, auth.uid(), is_admin trigger, atomic payout
-- C1: REVOKE public EXECUTE on update_password (password takeover vector)
-- C2: Fix delete_match — use auth.uid() instead of trusting client-provided user_id
-- C3: REVOKE public EXECUTE on process_verification_update (KYC auto-approval)
-- C5: REVOKE public EXECUTE on create_auth_user / verify_password / get_user_id_by_email / create_auth_user_with_profile
-- C6: Trigger to prevent non-service_role is_admin changes
-- H9: Atomic payout RPC to prevent race condition
-- H11: Comprehensive REVOKE EXECUTE on all auth-related SECURITY DEFINER RPCs

-- ═══════════════════════════════════════════════
-- C1 + H11: Revoke EXECUTE from public on auth RPCs
-- These should only be callable by service_role (admin client)
-- ═══════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(p_email TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_password(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) FROM PUBLIC, authenticated, anon;

-- Grant only to service_role (supabase_admin / service_role)
GRANT EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(p_email TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_password(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) TO service_role;

-- ═══════════════════════════════════════════════
-- C3: Revoke EXECUTE on process_verification_update from public
-- Only the server-side admin client should call this
-- ═══════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.process_verification_update(p_request_id UUID, p_user_id UUID, p_status TEXT, p_didit_verification_id TEXT, p_rejection_reason TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_verification_update(p_request_id UUID, p_user_id UUID, p_status TEXT, p_didit_verification_id TEXT, p_rejection_reason TEXT) TO service_role;

-- ═══════════════════════════════════════════════
-- C2: Rewrite delete_match to use auth.uid() instead of trusting client-provided user_id
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_match(match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_row RECORD;
  other_id UUID;
  requesting_user_id UUID;
BEGIN
  requesting_user_id := auth.uid();
  IF requesting_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  SELECT * INTO match_row FROM matches WHERE id = match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Match introuvable');
  END IF;

  IF match_row.user1_id <> requesting_user_id AND match_row.user2_id <> requesting_user_id THEN
    RETURN jsonb_build_object('error', 'Non autorisé');
  END IF;

  other_id := CASE WHEN match_row.user1_id = requesting_user_id THEN match_row.user2_id ELSE match_row.user1_id END;

  DELETE FROM swipes
  WHERE (swiper_id = requesting_user_id AND swiped_id = other_id)
     OR (swiper_id = other_id AND swiped_id = requesting_user_id);

  DELETE FROM messages WHERE messages.match_id = delete_match.match_id;
  DELETE FROM matches WHERE matches.id = delete_match.match_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_match(UUID) TO authenticated;

-- ═══════════════════════════════════════════════
-- C6: Prevent non-service_role updates to is_admin on profiles
-- Trigger blocks UPDATE of is_admin unless called by service_role
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_is_admin_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Only allow if the current role is service_role
    IF current_setting('role', true) != 'service_role' THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_is_admin_update ON public.profiles;
CREATE TRIGGER trg_prevent_is_admin_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.prevent_is_admin_update();

-- ═══════════════════════════════════════════════
-- H9: Atomic payout RPC — prevents race condition on balance check
-- Uses pg_advisory_xact_lock per user to serialize payouts
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_payout(
  p_user_id UUID,
  p_amount_cents INT,
  p_payment_details TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance INT;
  v_total_received INT;
  v_total_payouts INT;
  v_tx_id UUID;
BEGIN
  -- Serialize payouts per user
  PERFORM pg_advisory_xact_lock(hashtext('payout_' || p_user_id::text));

  -- Calculate balance atomically within the lock
  SELECT COALESCE(SUM(COALESCE(amount_paid, 0) - COALESCE(fee_cents, 0)), 0) INTO v_total_received
  FROM public.sent_gifts WHERE receiver_id = p_user_id AND status = 'completed';

  SELECT COALESCE(SUM(COALESCE(amount_cents, 0)), 0) INTO v_total_payouts
  FROM public.gift_transactions WHERE user_id = p_user_id AND type = 'payout' AND status IN ('completed', 'pending');

  v_balance := v_total_received - v_total_payouts;

  IF v_balance < p_amount_cents THEN
    RETURN jsonb_build_object('error', 'Solde insuffisant', 'balance', v_balance);
  END IF;

  INSERT INTO public.gift_transactions (user_id, type, amount_cents, payment_details, status)
  VALUES (p_user_id, 'payout', p_amount_cents, p_payment_details, 'pending')
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('tx_id', v_tx_id::TEXT, 'balance', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout(UUID, INT, TEXT) TO authenticated;


-- >>> migration_v40_pgcrypto_search_path.sql
-- Migration v40 — Fix pgcrypto extension + search_path for auth RPCs
-- The gen_salt('bf', 10) function requires pgcrypto extension
-- Supabase installs extensions in the 'extensions' schema by default
-- but our RPCs use SET search_path = public which excludes it.

-- ═══════════════════════════════════════════════
-- Enable pgcrypto extension if not already present
-- ═══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════
-- Recreate create_auth_user_with_profile with correct search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_age INTEGER,
  p_gender TEXT,
  p_interested_in TEXT[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Cet email est déjà utilisé');
  END IF;

  IF p_age < 18 OR p_age > 120 THEN
    RETURN jsonb_build_object('error', 'Âge invalide');
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.profiles (
    id, name, age, gender, interested_in, photos, interests,
    verification_status, is_verified, onboarding_complete
  ) VALUES (
    v_user_id, p_name, p_age, p_gender, p_interested_in, ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    'none', false, false
  );

  RETURN jsonb_build_object('user_id', v_user_id::TEXT);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) TO service_role;

-- ═══════════════════════════════════════════════
-- Recreate create_auth_user with correct search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) TO service_role;

-- ═══════════════════════════════════════════════
-- Recreate verify_password with correct search_path
-- Original returns UUID (user_id if match, NULL if not)
-- ═══════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.verify_password(p_email TEXT, p_password TEXT) CASCADE;

CREATE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users WHERE email = p_email;
  IF NOT FOUND OR v_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_stored = crypt(p_password, v_stored) THEN RETURN v_user_id; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) TO service_role;


-- >>> migration_v41_rendez_vous.sql
-- ============================================================
-- Migration v41: Rendez-vous (Date Planning) System
-- ============================================================

-- 1. planned_dates — core scheduling table
CREATE TABLE IF NOT EXISTS planned_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','rescheduled','completed','confirmed')),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('restaurant','cafe','cinema','bar','walk','hotel','other')),
  location TEXT,
  note TEXT CHECK (char_length(note) <= 500),
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancel_reason TEXT CHECK (char_length(cancel_reason) <= 300),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planned_dates_match ON planned_dates(match_id);
CREATE INDEX IF NOT EXISTS idx_planned_dates_proposer ON planned_dates(proposer_id);
CREATE INDEX IF NOT EXISTS idx_planned_dates_proposee ON planned_dates(proposee_id);
CREATE INDEX IF NOT EXISTS idx_planned_dates_status ON planned_dates(status);

-- 2. date_slots — proposed time slots per date
CREATE TABLE IF NOT EXISTS date_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID NOT NULL REFERENCES planned_dates(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  proposed_time TIME NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_slots_date ON date_slots(date_id);

-- 3. date_reminders — auto reminders
CREATE TABLE IF NOT EXISTS date_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID NOT NULL REFERENCES planned_dates(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL CHECK (type IN ('24h','2h','30min')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_reminders_date ON date_reminders(date_id);
CREATE INDEX IF NOT EXISTS idx_date_reminders_pending ON date_reminders(sent, remind_at)
  WHERE sent = false;

-- 4. RLS Policies
ALTER TABLE planned_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_reminders ENABLE ROW LEVEL SECURITY;

-- planned_dates: participants only
CREATE POLICY "Users can view dates they participate in"
  ON planned_dates FOR SELECT
  USING (auth.uid() IN (proposer_id, proposee_id));

CREATE POLICY "Users can propose dates"
  ON planned_dates FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Users can update dates they participate in"
  ON planned_dates FOR UPDATE
  USING (auth.uid() IN (proposer_id, proposee_id));

CREATE POLICY "Users can delete dates they participate in"
  ON planned_dates FOR DELETE
  USING (auth.uid() IN (proposer_id, proposee_id));

-- date_slots: via date ownership
CREATE POLICY "Users can view slots for their dates"
  ON date_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "Proposer can create slots"
  ON date_slots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() = proposer_id
  ));

CREATE POLICY "Users can update slots for their dates"
  ON date_slots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "Proposer can delete slots"
  ON date_slots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() = proposer_id
  ));

-- date_reminders: via date ownership
CREATE POLICY "Users can view reminders for their dates"
  ON date_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "System can manage reminders"
  ON date_reminders FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Functions
CREATE OR REPLACE FUNCTION get_upcoming_dates(p_user_id UUID)
RETURNS TABLE (
  id UUID, match_id UUID, category TEXT, location TEXT, note TEXT,
  status TEXT, proposer_id UUID, proposee_id UUID,
  slots JSONB, confirmed_at TIMESTAMPTZ,
  match_user_id UUID, match_user_name TEXT, match_user_photo TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pd.id, pd.match_id, pd.category, pd.location, pd.note,
    pd.status, pd.proposer_id, pd.proposee_id,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', ds.id, 'proposed_date', ds.proposed_date,
        'proposed_time', ds.proposed_time::TEXT, 'accepted', ds.accepted
      ) ORDER BY ds.proposed_date, ds.proposed_time)
      FROM date_slots ds WHERE ds.date_id = pd.id),
      '[]'::jsonb
    ) AS slots,
    pd.confirmed_at,
    CASE WHEN pd.proposer_id = p_user_id THEN pd.proposee_id ELSE pd.proposer_id END AS match_user_id,
    CASE WHEN pd.proposer_id = p_user_id THEN pr2.name ELSE pr1.name END AS match_user_name,
    CASE WHEN pd.proposer_id = p_user_id THEN pr2.photos[1] ELSE pr1.photos[1] END AS match_user_photo,
    pd.created_at
  FROM planned_dates pd
  JOIN profiles pr1 ON pr1.id = pd.proposer_id
  JOIN profiles pr2 ON pr2.id = pd.proposee_id
  WHERE (pd.proposer_id = p_user_id OR pd.proposee_id = p_user_id)
    AND pd.status IN ('pending','accepted','confirmed')
  ORDER BY pd.created_at DESC;
$$;

-- 6. Auto-reminder trigger function
CREATE OR REPLACE FUNCTION create_date_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create reminders for 24h, 2h, and 30min before the earliest accepted slot
  INSERT INTO date_reminders (date_id, remind_at, type)
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '24 hours',
    '24h'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true
  UNION ALL
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '2 hours',
    '2h'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true
  UNION ALL
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '30 minutes',
    '30min'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_date_reminders
  AFTER UPDATE OF status ON planned_dates
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION create_date_reminders();

-- 7. Update auto-notification on date accepted/confirmed
CREATE OR REPLACE FUNCTION notify_date_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES (
      NEW.proposer_id, 'date_accepted',
      'Rendez-vous accepté !',
      (SELECT name FROM profiles WHERE id = NEW.proposee_id) || ' a accepté ton invitation.',
      jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
      NEW.proposee_id
    );
  ELSIF NEW.status = 'confirmed' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES
    (NEW.proposer_id, 'date_confirmed',
     'Rendez-vous confirmé',
     'Ton rendez-vous est confirmé. Prépare-toi !',
     jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
     NEW.proposee_id),
    (NEW.proposee_id, 'date_confirmed',
     'Rendez-vous confirmé',
     'Ton rendez-vous est confirmé. Prépare-toi !',
     jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
     NEW.proposer_id);
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES (
      CASE WHEN NEW.cancelled_by = NEW.proposer_id THEN NEW.proposee_id ELSE NEW.proposer_id END,
      'date_cancelled',
      'Rendez-vous annulé',
      'Un rendez-vous a été annulé.',
      jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
      NEW.cancelled_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_date_event
  AFTER UPDATE OF status ON planned_dates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_date_event();

-- 8. Extend notifications CHECK constraint to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('match','flirt','message','super_like','verification','gift',
                  'date_accepted','date_confirmed','date_cancelled',
                  'story_liked','story_replied','profile_view','compatible_nearby',
                  'online_now','birthday','level_up','badge_earned'));

-- 9. Date propose RPC (atomic creation of date + slots)
CREATE OR REPLACE FUNCTION propose_date(
  p_match_id UUID,
  p_proposer_id UUID,
  p_category TEXT,
  p_location TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_slots JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposee_id UUID;
  v_date_id UUID;
  v_result JSONB;
  v_slot JSONB;
BEGIN
  -- Get proposee
  SELECT CASE WHEN user1_id = p_proposer_id THEN user2_id ELSE user1_id END
  INTO v_proposee_id
  FROM matches WHERE id = p_match_id;
  IF v_proposee_id IS NULL THEN RAISE EXCEPTION 'Match introuvable'; END IF;

  -- Create date
  INSERT INTO planned_dates (match_id, proposer_id, proposee_id, category, location, note, status)
  VALUES (p_match_id, p_proposer_id, v_proposee_id, p_category, p_location, p_note, 'pending')
  RETURNING id INTO v_date_id;

  -- Create slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO date_slots (date_id, proposed_date, proposed_time)
    VALUES (v_date_id, (v_slot->>'proposed_date')::DATE, (v_slot->>'proposed_time')::TIME);
  END LOOP;

  -- Return result with joined data
  SELECT jsonb_build_object(
    'id', pd.id,
    'match_id', pd.match_id,
    'proposer_id', pd.proposer_id,
    'proposee_id', pd.proposee_id,
    'status', pd.status,
    'category', pd.category,
    'location', pd.location,
    'note', pd.note,
    'created_at', pd.created_at,
    'match_user_name', pr.name,
    'match_user_photo', pr.photos[1]
  ) INTO v_result
  FROM planned_dates pd
  JOIN profiles pr ON pr.id = v_proposee_id
  WHERE pd.id = v_date_id;

  RETURN v_result;
END;
$$;

-- 10. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE planned_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE date_slots;


-- >>> migration_v42_stories_enhance.sql
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


-- >>> migration_v43_advanced_search.sql
-- Migration v43: Advanced Search — saved searches + filter profiles table

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id);

-- Add profile columns needed for advanced filters (if not exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height INT CHECK (height >= 100 AND height <= 250);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT CHECK (char_length(education) <= 200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoker TEXT CHECK (smoker IN ('yes','no','sometimes'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drinker TEXT CHECK (drinker IN ('yes','no','sometimes'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wants_kids TEXT CHECK (wants_kids IN ('yes','no','open'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_pets TEXT CHECK (has_pets IN ('yes','no','open'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sports TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music TEXT[] DEFAULT '{}';

-- Indexes for filterable columns
CREATE INDEX IF NOT EXISTS idx_profiles_height ON profiles(height) WHERE height IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_smoker ON profiles(smoker) WHERE smoker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_drinker ON profiles(drinker) WHERE drinker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON profiles USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_profiles_sports ON profiles USING GIN (sports);
CREATE INDEX IF NOT EXISTS idx_profiles_music ON profiles USING GIN (music);


-- >>> migration_v44_notifications_enhance.sql
-- Migration v44: Enhanced notifications + stats + recommendation tracking

-- Notification types enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'like', 'super_like', 'match', 'message', 'flirt', 'story_reply',
    'date_proposal', 'date_accepted', 'date_reminder', 'date_cancelled',
    'gift', 'visit', 'system', 'promo', 'event_invite', 'event_reminder',
    'level_up', 'achievement', 'milestone'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type notification_type NOT NULL DEFAULT 'like';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_swipes INT NOT NULL DEFAULT 0,
  total_matches INT NOT NULL DEFAULT 0,
  total_messages_sent INT NOT NULL DEFAULT 0,
  total_dates INT NOT NULL DEFAULT 0,
  total_stories INT NOT NULL DEFAULT 0,
  total_gifts_sent INT NOT NULL DEFAULT 0,
  total_gifts_received INT NOT NULL DEFAULT 0,
  profile_views INT NOT NULL DEFAULT 0,
  daily_likes_received INT NOT NULL DEFAULT 0,
  weekly_likes_received INT NOT NULL DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time_min INT DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_matches ON user_stats(total_matches DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_swipes ON user_stats(total_swipes DESC);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can upsert stats" ON user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update stats" ON user_stats FOR UPDATE USING (true);

-- Level / XP system
CREATE TABLE IF NOT EXISTS user_levels (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  xp_to_next INT NOT NULL DEFAULT 100,
  total_xp INT NOT NULL DEFAULT 0,
  title TEXT,
  badge TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their level" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can upsert levels" ON user_levels FOR ALL USING (true);

-- Compatibility score history
CREATE TABLE IF NOT EXISTS compatibility_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  spark_score DECIMAL(5,2),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_compat_history_user ON compatibility_history(user_id);
CREATE INDEX IF NOT EXISTS idx_compat_history_pair ON compatibility_history(user_id, target_id);

ALTER TABLE compatibility_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their compatibility" ON compatibility_history FOR SELECT USING (auth.uid() = user_id);

-- Achievement system
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  xp_reward INT NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON user_achievements FOR ALL USING (true);


-- >>> migration_v45_seed_achievements.sql
-- Migration v45: Seed achievements + XP rules

INSERT INTO achievements (key, name, description, icon, xp_reward, category) VALUES
  ('first_like', 'Premier like', 'Donne ton premier like', '👍', 10, 'social'),
  ('first_match', 'Premier match', 'Obtiens ton premier match', '💕', 25, 'social'),
  ('ten_matches', 'Dix matches', 'Atteins 10 matches', '🔥', 50, 'social'),
  ('first_message', 'Premier message', 'Envoie ton premier message', '💬', 15, 'social'),
  ('chatty', 'Bavard', 'Envoie 100 messages', '🗣️', 75, 'social'),
  ('first_date', 'Premier rendez-vous', 'Planifie un rendez-vous', '📅', 50, 'dating'),
  ('five_dates', 'Romantique', 'Va à 5 rendez-vous', '🌹', 100, 'dating'),
  ('first_story', 'Première story', 'Publie ta première story', '📸', 20, 'content'),
  ('storyteller', 'Conteur', 'Publie 10 stories', '🎬', 60, 'content'),
  ('early_bird', 'Lève-tôt', 'Connecte-toi avant 8h', '🌅', 15, 'habits'),
  ('night_owl', 'Oiseau de nuit', 'Connecte-toi après minuit', '🦉', 15, 'habits'),
  ('social_butterfly', 'Papillon social', 'Affiche 5 centres d''intérêt', '🦋', 30, 'profile'),
  ('profile_star', 'Profil complet', 'Remplis toutes les sections du profil', '⭐', 40, 'profile'),
  ('verified', 'Vérifié', 'Vérifie ton identité', '✅', 100, 'trust'),
  ('streak_7', 'Semaine complète', 'Maintiens une série de 7 jours', '📆', 70, 'habits'),
  ('streak_30', 'Mois dédié', 'Maintiens une série de 30 jours', '🏆', 200, 'habits'),
  ('super_liker', 'Super like', 'Envoie un super like', '🌟', 30, 'social'),
  ('gift_giver', 'Généreux', 'Envoie un cadeau', '🎁', 40, 'social'),
  ('level_5', 'Niveau 5', 'Atteins le niveau 5', '🎖️', 0, 'milestones'),
  ('level_10', 'Niveau 10', 'Atteins le niveau 10', '💎', 0, 'milestones')
ON CONFLICT (key) DO NOTHING;


-- >>> migration_v46_i18n.sql
-- Migration v46: i18n language support

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'));


