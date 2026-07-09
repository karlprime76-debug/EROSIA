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
