-- Migration v46: i18n language support

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'));
