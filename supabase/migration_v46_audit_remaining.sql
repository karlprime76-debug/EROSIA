-- Migration v46: Corrections finales issues de l'audit 2026-07
-- 🔴 = critique | 🟡 = important | 🟢 = polish

-- ============================================================
-- 1. 🔴 Achievements: activer RLS (table actuellement sans protection)
-- ============================================================
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_all" ON achievements
  FOR SELECT USING (true);

-- ============================================================
-- 2. 🔴 blocked_users: déprécier en faveur de blocks
--    (deux tables concurrentes : blocks + blocked_users)
-- ============================================================
-- Créer une vue unifiée pour la migration
CREATE OR REPLACE VIEW blocked_users_view AS
  SELECT blocker_id AS user_id, blocked_id, created_at
  FROM blocks;

COMMENT ON VIEW blocked_users_view IS 'Vue unifiée remplaçant blocked_users (obsolète). Utiliser la table blocks.';

-- ============================================================
-- 3. 🟡 notifications.type: aligner avec les valeurs du code
--    (code attend : match, like, super_like vs DB : like_received, etc.)
-- ============================================================
-- Vérifier le type actuel et créer un mapping si nécessaire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'match' BEFORE 'like_received';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'like' BEFORE 'super_like_received';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'super_like' BEFORE 'new_match';
  END IF;
END;
$$;

-- ============================================================
-- 4. 🟡 propose_date / process_payout : search_path explicite
--    (SECURITY DEFINER sans search_path = vulnérabilité)
-- ============================================================
DROP FUNCTION IF EXISTS propose_date(UUID, UUID, TIMESTAMPTZ, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_payout(UUID, INTEGER, TEXT);

CREATE FUNCTION propose_date(
  p_match_id UUID,
  p_proposer_id UUID,
  p_date TIMESTAMPTZ,
  p_location TEXT,
  p_description TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_date_id UUID;
BEGIN
  INSERT INTO dates (match_id, proposer_id, date, location, description)
  VALUES (p_match_id, p_proposer_id, p_date, p_location, p_description)
  RETURNING id INTO v_date_id;
  RETURN v_date_id;
END;
$$;

CREATE FUNCTION process_payout(
  p_user_id UUID,
  p_amount_cents INTEGER,
  p_payment_method TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount_paid - fee_cents), 0) INTO v_balance
  FROM sent_gifts WHERE receiver_id = p_user_id AND status = 'completed';

  IF v_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Solde insuffisant' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO gift_transactions (user_id, type, amount_cents, payment_details, status)
  VALUES (p_user_id, 'payout', p_amount_cents, jsonb_build_object('method', p_payment_method), 'pending')
  RETURNING id INTO v_tx_id;
  RETURN v_tx_id;
END;
$$;

-- ============================================================
-- 5. 🟢 Index manquant sur notifications.created_at
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
