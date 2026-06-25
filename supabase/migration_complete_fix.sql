-- =====================================================
-- Migration complète : toutes les colonnes et tables manquantes
-- Sans risque, tout est en IF NOT EXISTS / DROP ... IF EXISTS
-- =====================================================

-- 1. Messages : view_once (messages éphémères à vue unique)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT false;

-- 2. Moderation queue : status (approuvé/rejeté par l'admin)
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Sent gifts : amount_paid, fee_cents, status (pour le webhook PayDunya)
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS amount_paid INT;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS fee_cents INT;
ALTER TABLE sent_gifts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'));

-- 4. Notifications : ajouter le type 'gift' dans la contrainte CHECK
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('match', 'flirt', 'message', 'super_like', 'verification', 'gift'));

-- 5. Payment accounts (boutique de cadeaux)
CREATE TABLE IF NOT EXISTS payment_accounts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mobile_money', 'card')),
  phone TEXT,
  country TEXT,
  operator TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own payment account" ON payment_accounts;
CREATE POLICY "Users can manage own payment account"
  ON payment_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Profile video_url (si pas déjà fait)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 7. Admin : colonne is_admin sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Promouvoir l'admin existant (remplace par ton UUID)
-- UPDATE profiles SET is_admin = true WHERE id = 'TON_UUID';
