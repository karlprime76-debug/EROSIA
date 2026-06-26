-- Add settings columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'matches', 'none'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_push BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_email BOOLEAN DEFAULT true;

-- Prevent self-match in swipes (client-side also prevents this)
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_no_self;
ALTER TABLE swipes ADD CONSTRAINT swipes_no_self CHECK (swiper_id <> swiped_id);

-- Prevent self-match in matches
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_no_self;
ALTER TABLE matches ADD CONSTRAINT matches_no_self CHECK (user1_id <> user2_id);

-- Add index for faster profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_date ON swipes(swiper_id, created_at DESC);
