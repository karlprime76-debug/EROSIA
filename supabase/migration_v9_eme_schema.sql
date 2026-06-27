-- Migration v9: Erosia Match Engine (EME) — schema
-- run after migration_v8_fix_missing_columns.sql

-- 1. Behavior log (event sourcing pour tout tracking)
CREATE TABLE IF NOT EXISTS behavior_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'view_profile', 'swipe_like', 'swipe_pass', 'swipe_super_like',
    'send_message', 'open_message', 'reply_message',
    'view_story', 'send_flirt', 'send_gift', 'start_call',
    'unmatch', 'block', 'report', 'visit_chat',
    'complete_quiz', 'update_profile', 'update_photo'
  )),
  metadata JSONB DEFAULT '{}',
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_log_user ON behavior_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_target ON behavior_log(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_action ON behavior_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_log_created ON behavior_log(created_at DESC);

ALTER TABLE behavior_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own behavior"
  ON behavior_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own behavior"
  ON behavior_log FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Scores pré-calculés par utilisateur
CREATE TABLE IF NOT EXISTS user_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  compatibility_score FLOAT8 DEFAULT 0,
  behavior_score FLOAT8 DEFAULT 0,
  trust_score FLOAT8 DEFAULT 50,
  activity_score FLOAT8 DEFAULT 1.0,
  conversation_score FLOAT8 DEFAULT 0,
  spark_score FLOAT8 DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores"
  ON user_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage scores"
  ON user_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Cache de compatibilité par paire
CREATE TABLE IF NOT EXISTS compatibility_cache (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score FLOAT8 NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_compat_cache_user ON compatibility_cache(user_id, score DESC);

ALTER TABLE compatibility_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compatibility cache"
  ON compatibility_cache FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Interest Graph — intérêts catégorisés
CREATE TABLE IF NOT EXISTS interest_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  weight INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interest_graph_category ON interest_graph(category);

ALTER TABLE interest_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view interest graph" ON interest_graph FOR SELECT USING (true);

-- 5. Relations entre intérêts (co-occurrence)
CREATE TABLE IF NOT EXISTS interest_relations (
  interest_id UUID NOT NULL REFERENCES interest_graph(id) ON DELETE CASCADE,
  related_id UUID NOT NULL REFERENCES interest_graph(id) ON DELETE CASCADE,
  strength FLOAT8 DEFAULT 1.0,
  PRIMARY KEY (interest_id, related_id),
  CHECK (interest_id <> related_id)
);

ALTER TABLE interest_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view interest relations" ON interest_relations FOR SELECT USING (true);

-- 6. Mapping profiles → interest_graph
CREATE TABLE IF NOT EXISTS profile_interests (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES interest_graph(id) ON DELETE CASCADE,
  level INT DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  PRIMARY KEY (profile_id, interest_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_interests_profile ON profile_interests(profile_id);

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view profile interests" ON profile_interests FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile interests" ON profile_interests FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete own profile interests" ON profile_interests FOR DELETE USING (auth.uid() = profile_id);

-- 7. Ajout colonne langue sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'fr';
