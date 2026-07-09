-- Migration v28: Gift checkout validation + RLS gift_transactions

-- 1. RLS : seuls les paiements sortants (payout) sont autorisés en INSERT
--    (gift_received est inséré par le webhook via service_role, qui bypass RLS)
DROP POLICY IF EXISTS "Users can insert own transactions" ON gift_transactions;

CREATE POLICY "Users can insert payouts"
  ON gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND type = 'payout');

-- 2. Index pour la validation des matches côté API
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
