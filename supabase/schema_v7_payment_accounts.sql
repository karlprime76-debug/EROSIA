-- Payment accounts for gift shop
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
