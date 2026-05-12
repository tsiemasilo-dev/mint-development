-- =============================================================================
-- MINT — Missing Tables (run in Supabase SQL Editor)
-- Only 4 tables are missing from the existing schema
-- =============================================================================

-- 1. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text,
  url        text,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. CREDIT_SCORE_HISTORY
CREATE TABLE IF NOT EXISTS credit_score_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      integer,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own credit score history"
  ON credit_score_history FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_user ON credit_score_history (user_id, created_at DESC);

-- 3. INSURANCE_POLICIES
CREATE TABLE IF NOT EXISTS insurance_policies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text,
  status       text DEFAULT 'active',
  premium      numeric,
  cover_amount numeric,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own policies"
  ON insurance_policies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. STOCK_HOLDINGS  (server-side portfolio table)
CREATE TABLE IF NOT EXISTS stock_holdings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol         text,
  name           text,
  quantity       numeric,
  avg_fill       numeric,
  last_price     numeric,
  market_value   numeric,
  unrealized_pnl numeric,
  strategy_id    uuid,
  logo_url       text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own holdings"
  ON stock_holdings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_stock_holdings_user_id ON stock_holdings (user_id);
