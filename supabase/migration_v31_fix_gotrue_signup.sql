-- Migration v31 — Fix GoTrue signup 500
-- Problème : le trigger par défaut sur auth.users (on_auth_user_created)
-- référence profiles sans SET search_path = public, ce qui fait 500 sur signup.
-- L'app crée déjà les profils via createProfile() dans la route register,
-- donc ce trigger est non seulement cassé mais redondant.

-- 1. Drop le trigger (quel que soit son nom)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_active ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 2. Drop la fonction associée (quel que soit son nom)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS auth.handle_new_user();
DROP FUNCTION IF EXISTS extensions.handle_new_user();
