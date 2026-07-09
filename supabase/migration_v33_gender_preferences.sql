-- Migration v33 — Gender & preferences

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non_binary'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interested_in TEXT[] DEFAULT '{}';
