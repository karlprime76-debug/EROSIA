-- Migration v37 — KYC audit fixes
-- F28: Add CHECK constraint on verification_requests status (already done in v34, ensure it exists)
-- F26: Fix rejection_reason — only set when status = 'rejected'
-- F29: Trigger to auto-update profiles when verification_requests changes
-- F30: Clean up old verification requests on retry
-- F31: webhook_events table for atomic dedup
-- F4: Function for atomic dedup

-- ═══════════════════════════════════════════════
-- F31: webhook_events table for atomic dedup
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'didit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);

-- ═══════════════════════════════════════════════
-- F4: Atomic dedup function — returns true if first time
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.try_claim_webhook_event(p_event_id TEXT, p_source TEXT DEFAULT 'didit')
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO webhook_events (event_id, source)
  VALUES (p_event_id, p_source)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- ═══════════════════════════════════════════════
-- F10: Transactional update — updates verification_requests + profiles atomically
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_verification_update(
  p_request_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_didit_verification_id TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verification_requests
  SET
    status = p_status,
    didit_verification_id = COALESCE(p_didit_verification_id, didit_verification_id),
    verified_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_request_id;

  UPDATE profiles
  SET
    verification_status = p_status,
    is_verified = (p_status = 'approved'),
    verified_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    didit_verification_id = CASE WHEN p_status = 'approved' THEN COALESCE(p_didit_verification_id, didit_verification_id) ELSE NULL END
  WHERE id = p_user_id;
END;
$$;

-- ═══════════════════════════════════════════════
-- F30: Clean up old rejected/expired requests on new session
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.archive_old_verification_requests()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE verification_requests
  SET status = 'archived'
  WHERE user_id = NEW.user_id
    AND status IN ('rejected', 'expired', 'unknown', 'manual_review')
    AND id != NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_old_verifications ON verification_requests;
CREATE TRIGGER trg_archive_old_verifications
  AFTER INSERT ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_old_verification_requests();

-- ═══════════════════════════════════════════════
-- F26: Ensure rejection_reason only set on 'rejected'
-- (handled in app logic, but add DB-level enforcement)
-- ═══════════════════════════════════════════════
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS chk_rejection_reason_only_rejected;
ALTER TABLE verification_requests ADD CONSTRAINT chk_rejection_reason_only_rejected
  CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL) OR
    (status != 'rejected' AND rejection_reason IS NULL)
  );

-- Add 'archived' to allowed statuses
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'manual_review', 'unknown', 'archived'));
