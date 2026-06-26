-- Gift wallet: transactions pour solde et retraits
CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gift_received', 'payout')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  sent_gift_id UUID REFERENCES sent_gifts(id) ON DELETE SET NULL,
  payment_details TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON gift_transactions;
CREATE POLICY "Users can view own transactions"
  ON gift_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON gift_transactions;
CREATE POLICY "Users can insert own transactions"
  ON gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_user ON gift_transactions(user_id, created_at DESC);
