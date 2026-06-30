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
