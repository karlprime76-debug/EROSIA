-- Migration v34 — KYC verification system fixes

-- 1. Fix verification_requests table
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS didit_session_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS didit_verification_id TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE verification_requests ALTER COLUMN photo_url DROP NOT NULL;

-- Relax status check to include all Didit statuses
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'manual_review', 'unknown'));

-- 2. Add verification columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none'
  CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected', 'expired', 'manual_review'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS didit_verification_id TEXT;

-- 3. Index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_verification_requests_didit_session ON verification_requests(didit_session_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
