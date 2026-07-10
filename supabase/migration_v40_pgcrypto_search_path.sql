-- Migration v40 — Fix pgcrypto extension + search_path for auth RPCs
-- The gen_salt('bf', 10) function requires pgcrypto extension
-- Supabase installs extensions in the 'extensions' schema by default
-- but our RPCs use SET search_path = public which excludes it.

-- ═══════════════════════════════════════════════
-- Enable pgcrypto extension if not already present
-- ═══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════
-- Recreate create_auth_user_with_profile with correct search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_age INTEGER,
  p_gender TEXT,
  p_interested_in TEXT[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Cet email est déjà utilisé');
  END IF;

  IF p_age < 18 OR p_age > 120 THEN
    RETURN jsonb_build_object('error', 'Âge invalide');
  END IF;

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
    NULL, NULL,
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
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.profiles (
    id, name, age, gender, interested_in, photos, interests,
    verification_status, is_verified, onboarding_complete
  ) VALUES (
    v_user_id, p_name, p_age, p_gender, p_interested_in, ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    'none', false, false
  );

  RETURN jsonb_build_object('user_id', v_user_id::TEXT);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_auth_user_with_profile(p_email TEXT, p_password TEXT, p_name TEXT, p_age INTEGER, p_gender TEXT, p_interested_in TEXT[]) TO service_role;

-- ═══════════════════════════════════════════════
-- Recreate create_auth_user with correct search_path
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, extensions
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
    NULL, NULL,
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
      'email_verified', false,
      'phone_verified', false
    ),
    'email', p_email,
    NOW(), NOW(), NOW()
  );
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT) TO service_role;

-- ═══════════════════════════════════════════════
-- Recreate verify_password with correct search_path
-- Original returns UUID (user_id if match, NULL if not)
-- ═══════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.verify_password(p_email TEXT, p_password TEXT) CASCADE;

CREATE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users WHERE email = p_email;
  IF NOT FOUND OR v_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_stored = crypt(p_password, v_stored) THEN RETURN v_user_id; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.verify_password(p_email TEXT, p_password TEXT) TO service_role;
