-- Migration v10: Didit identity verification

-- Crée la table si elle n'existe pas (pour les bases qui n'ont pas schema_v3)
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT,
  didit_session_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour verification_requests
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

-- Trigger pour marquer is_verified automatiquement
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

-- Ajoute title/message aux notifications pour les messages personnalisés
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;

-- Index pour recherche rapide par session Didit
CREATE INDEX IF NOT EXISTS idx_verification_requests_didit_session
ON verification_requests(didit_session_id);
