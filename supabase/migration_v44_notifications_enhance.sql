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
