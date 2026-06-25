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
