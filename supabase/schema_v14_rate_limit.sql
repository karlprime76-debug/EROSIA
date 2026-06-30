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
