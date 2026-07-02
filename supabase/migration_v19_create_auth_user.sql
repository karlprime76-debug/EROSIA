-- Migration v19: Create auth user via SECURITY DEFINER
-- Contourne le service GoTrue (en panne 2026-07) en écrivant directement
-- dans auth.users/auth.identities avec une fonction run as superuser.
-- Appliquer dans Supabase SQL Editor.
-- Usage depuis le code : SELECT public.create_auth_user('email', 'password');

CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions
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
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email, v_encrypted,
    NOW(), NOW(),
    '{"provider":"email"}', '{}',
    NOW(), NOW(),
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', p_email),
    'email',
    NOW(), NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
