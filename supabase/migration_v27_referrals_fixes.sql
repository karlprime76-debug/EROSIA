-- Migration v27: Referrals fixes — constraints, RLS, RPC atomiques, multi-cycle

-- 1. Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles (referral_code);

-- 2. UNIQUE constraints
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

UPDATE referrals SET referred_id = gen_random_uuid() WHERE referred_id IS NULL;
ALTER TABLE referrals ALTER COLUMN referred_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 3. RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select_own ON referrals;
DROP POLICY IF EXISTS referrals_insert_referred ON referrals;

CREATE POLICY referrals_select_own ON referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY referrals_insert_referred ON referrals
  FOR INSERT
  WITH CHECK (referred_id = auth.uid());

-- 4. RPC: apply_referral_code (atomic, replay protection via UNIQUE)
CREATE OR REPLACE FUNCTION apply_referral_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = p_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code invalide');
  END IF;
  IF v_referrer_id = p_user_id THEN
    RETURN jsonb_build_object('error', 'Auto-parrainage non autorisé');
  END IF;
  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, p_user_id, 'joined');
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Code déjà utilisé');
END;
$$;

-- 5. RPC: redeem_referral_reward (atomic, advisory lock, exactly 5 at a time)
CREATE OR REPLACE FUNCTION redeem_referral_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('redeem_' || p_user_id::text));

  SELECT count(*) INTO v_count
  FROM referrals
  WHERE referrer_id = p_user_id
    AND status = 'joined'
    AND NOT reward_granted;

  IF v_count < 5 THEN
    RETURN jsonb_build_object('error', '5 filleuls requis');
  END IF;

  SELECT premium_expires_at INTO v_current_expiry
  FROM profiles WHERE id = p_user_id;

  v_new_expiry := greatest(coalesce(v_current_expiry, now()), now()) + interval '30 days';

  UPDATE profiles
  SET subscription_tier = 'premium',
      premium_expires_at = v_new_expiry
  WHERE id = p_user_id;

  UPDATE referrals
  SET reward_granted = true
  WHERE ctid IN (
    SELECT ctid FROM referrals
    WHERE referrer_id = p_user_id
      AND status = 'joined'
      AND NOT reward_granted
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  );

  RETURN jsonb_build_object('success', true, 'premium_expires_at', v_new_expiry);
END;
$$;
