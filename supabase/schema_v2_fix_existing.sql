-- Fixer les NULL sur les profils existants après schema_v2
UPDATE profiles SET incognito = false WHERE incognito IS NULL;
UPDATE profiles SET super_likes_remaining = 1 WHERE super_likes_remaining IS NULL;
UPDATE profiles SET is_admin = false WHERE is_admin IS NULL;
