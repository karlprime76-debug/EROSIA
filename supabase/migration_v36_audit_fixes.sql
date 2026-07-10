-- Migration v36 — Audit fixes batch
-- H5: Fix create_auth_user search_path (extensions,public → public)
-- H6: view_once — delete storage object after read
-- H4: Consolidate duplicate reports table
-- M6: Add last_seen trigger for new users
-- M4: Fix is_chat_participant split_part fragility

-- ═══════════════════════════════════════════════
-- H5: Fix create_auth_user/verify_password search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted := crypt(p_password, gen_salt('bf', 10));
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object(
      'sub', v_user_id::TEXT,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users
  WHERE email = p_email;
  IF NOT FOUND OR v_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_stored = crypt(p_password, v_stored) THEN RETURN v_user_id; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashed TEXT;
BEGIN
  v_hashed := crypt(p_password, gen_salt('bf', 10));
  UPDATE auth.users SET encrypted_password = v_hashed, updated_at = NOW() WHERE email = p_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- H6: view_once — also delete storage object
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_view_once_read()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_object_path TEXT;
BEGIN
  IF NEW.view_once = true AND NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    IF NEW.image_url IS NOT NULL THEN
      v_object_path := substring(NEW.image_url from '/chat_photos/(.+)$');
      IF v_object_path IS NOT NULL THEN
        PERFORM storage.objects.delete('chat_photos', v_object_path);
      END IF;
    END IF;
    NEW.image_url = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- H4: Consolidate reports — ensure single table
-- schema.sql has simple CREATE TABLE, migration_v17_safety has extra columns
-- Already CREATE TABLE IF NOT EXISTS, just ensure latest columns exist
-- ═══════════════════════════════════════════════
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════
-- M6: Update last_seen for new users
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_last_seen()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET last_seen = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_last_seen ON auth.users;
CREATE TRIGGER trg_set_last_seen
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_last_seen();

-- ═══════════════════════════════════════════════
-- M4: Fix is_chat_participant — use consistent path matching
-- Replace split_part with regex for robustness
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_chat_participant(storage_path TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_id_from_path UUID;
  participant1 UUID;
  participant2 UUID;
BEGIN
  -- Extract match ID from path: chat/{matchId}/{timestamp}_{userId}_{filename}
  match_id_from_path := substring(storage_path from '^chat/([^/]+)/')::UUID;
  IF match_id_from_path IS NULL THEN RETURN false; END IF;
  SELECT user1_id, user2_id INTO participant1, participant2
  FROM matches WHERE id = match_id_from_path;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN (participant1 = p_user_id OR participant2 = p_user_id);
END;
$$;
