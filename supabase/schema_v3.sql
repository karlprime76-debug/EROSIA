-- Erosia Schema v3 - Premium, Selfie, Stories, Travel, Reactions, Notifications, Icebreakers
-- Run this after schema_v2.sql

-- ==============================
-- Part 1: Profiles new columns
-- ==============================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paydunya_invoice_token TEXT;
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
