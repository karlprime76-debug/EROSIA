-- Migration v50: Fix verification_status consistency
-- Le trigger mettait 'verified' mais le RPC met 'approved'
-- normalizeStatus() ne gérait pas 'verified' → UI affichait "inconnu"

CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles SET is_verified = true, verification_status = 'approved', verified_at = NOW() WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
