-- Migration v19: Create auth user via SECURITY DEFINER
-- Contourne le service GoTrue (en panne 2026-07) en écrivant directement
-- dans auth.users/auth.identities avec une fonction run as superuser.
-- Appliquer dans Supabase SQL Editor.
-- Usage depuis le code : SELECT public.create_auth_user('email', 'password');

-- Colonne manquante pour le trigger on_auth_user_active
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.create_auth_user(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
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

-- Fonction de vérification de mot de passe (contourne GoTrue)
CREATE OR REPLACE FUNCTION public.verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_user_id UUID;
  v_stored TEXT;
BEGIN
  SELECT id, encrypted_password INTO v_user_id, v_stored
  FROM auth.users
  WHERE email = p_email;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_stored = crypt(p_password, v_stored) THEN
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Récupère l'ID d'un utilisateur par email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Met à jour le mot de passe d'un utilisateur (hash bcrypt)
CREATE OR REPLACE FUNCTION public.update_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  v_hashed TEXT;
BEGIN
  v_hashed := crypt(p_password, gen_salt('bf', 10));
  UPDATE auth.users
  SET encrypted_password = v_hashed, updated_at = NOW()
  WHERE email = p_email;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
