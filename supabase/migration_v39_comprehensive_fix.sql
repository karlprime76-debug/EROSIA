-- Migration v39 — Audit fixes: REVOKE EXECUTE, auth.uid(), is_admin trigger, atomic payout
-- C1: REVOKE public EXECUTE on update_password (password takeover vector)
-- C2: Fix delete_match — use auth.uid() instead of trusting client-provided user_id
-- C3: REVOKE public EXECUTE on process_verification_update (KYC auto-approval)
-- C5: REVOKE public EXECUTE on create_auth_user / verify_password / get_user_id_by_email / create_auth_user_with_profile
-- C6: Trigger to prevent non-service_role is_admin changes
-- H9: Atomic payout RPC to prevent race condition
-- H11: Comprehensive REVOKE EXECUTE on all auth-related SECURITY DEFINER RPCs

-- ═══════════════════════════════════════════════
-- C1 + H11: Revoke EXECUTE from public on auth RPCs
-- These should only be callable by service_role (admin client)
-- ═══════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(p_email TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_password(p_email TEXT, p_password TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) FROM PUBLIC, authenticated, anon;

-- Grant only to service_role (supabase_admin / service_role)
GRANT EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(p_email TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_password(p_email TEXT, p_password TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) TO service_role;

-- ═══════════════════════════════════════════════
-- C3: Revoke EXECUTE on process_verification_update from public
-- Only the server-side admin client should call this
-- ═══════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.process_verification_update(p_request_id UUID, p_user_id UUID, p_status TEXT, p_didit_verification_id TEXT, p_rejection_reason TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_verification_update(p_request_id UUID, p_user_id UUID, p_status TEXT, p_didit_verification_id TEXT, p_rejection_reason TEXT) TO service_role;

-- ═══════════════════════════════════════════════
-- C2: Rewrite delete_match to use auth.uid() instead of trusting client-provided user_id
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_match(match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_row RECORD;
  other_id UUID;
  requesting_user_id UUID;
BEGIN
  requesting_user_id := auth.uid();
  IF requesting_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

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

GRANT EXECUTE ON FUNCTION public.delete_match(UUID) TO authenticated;

-- ═══════════════════════════════════════════════
-- C6: Prevent non-service_role updates to is_admin on profiles
-- Trigger blocks UPDATE of is_admin unless called by service_role
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_is_admin_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Only allow if the current role is service_role
    IF current_setting('role', true) != 'service_role' THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_is_admin_update ON public.profiles;
CREATE TRIGGER trg_prevent_is_admin_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.prevent_is_admin_update();

-- ═══════════════════════════════════════════════
-- H9: Atomic payout RPC — prevents race condition on balance check
-- Uses pg_advisory_xact_lock per user to serialize payouts
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_payout(
  p_user_id UUID,
  p_amount_cents INT,
  p_payment_details TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance INT;
  v_total_received INT;
  v_total_payouts INT;
  v_tx_id UUID;
BEGIN
  -- Serialize payouts per user
  PERFORM pg_advisory_xact_lock(hashtext('payout_' || p_user_id::text));

  -- Calculate balance atomically within the lock
  SELECT COALESCE(SUM(COALESCE(amount_paid, 0) - COALESCE(fee_cents, 0)), 0) INTO v_total_received
  FROM public.sent_gifts WHERE receiver_id = p_user_id AND status = 'completed';

  SELECT COALESCE(SUM(COALESCE(amount_cents, 0)), 0) INTO v_total_payouts
  FROM public.gift_transactions WHERE user_id = p_user_id AND type = 'payout' AND status IN ('completed', 'pending');

  v_balance := v_total_received - v_total_payouts;

  IF v_balance < p_amount_cents THEN
    RETURN jsonb_build_object('error', 'Solde insuffisant', 'balance', v_balance);
  END IF;

  INSERT INTO public.gift_transactions (user_id, type, amount_cents, payment_details, status)
  VALUES (p_user_id, 'payout', p_amount_cents, p_payment_details, 'pending')
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('tx_id', v_tx_id::TEXT, 'balance', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payout(UUID, INT, TEXT) TO authenticated;
