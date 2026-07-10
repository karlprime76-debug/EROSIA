-- Migration v38 — Registration fixes
-- F1/F2: Transactional RPC that creates auth user + profile atomically
-- F6: Email verification — remove auto-confirm, require email verification
-- F7: DB-level CHECK age >= 18

-- ═══════════════════════════════════════════════
-- F1/F2: Atomic registration — creates auth user, identity, and profile in one transaction
-- Handles duplicate email gracefully with meaningful error
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
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted TEXT;
  v_existing_id UUID;
BEGIN
  -- Check if email already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Cet email est déjà utilisé');
  END IF;

  -- Validate age
  IF p_age < 18 OR p_age > 120 THEN
    RETURN jsonb_build_object('error', 'Âge invalide');
  END IF;

  -- Create auth user
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
    NULL, NULL,  -- email NOT auto-confirmed
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(),
    '', '', '', '',
    false, false
  );

  -- Create identity
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

  -- Create profile
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

-- ═══════════════════════════════════════════════
-- F7: DB-level age constraint
-- ═══════════════════════════════════════════════
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_age_min;
ALTER TABLE profiles ADD CONSTRAINT chk_age_min CHECK (age >= 18 OR age IS NULL);

-- ═══════════════════════════════════════════════
-- F6: Drop auto-confirm from old RPC (if it still exists)
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
    NULL, NULL,  -- email NOT auto-confirmed
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
