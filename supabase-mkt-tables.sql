-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS mkt_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID,
  symbol TEXT NOT NULL,
  last_price_cents BIGINT DEFAULT 0,
  previous_close_cents BIGINT DEFAULT 0,
  change_cents BIGINT DEFAULT 0,
  change_percent NUMERIC(10,4) DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  exchange TEXT,
  market_status TEXT DEFAULT 'closed',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol)
);

CREATE TABLE IF NOT EXISTS mkt_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID,
  symbol TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  open_price_cents BIGINT,
  high_price_cents BIGINT,
  low_price_cents BIGINT,
  close_price_cents BIGINT NOT NULL,
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, as_of_date)
);

CREATE TABLE IF NOT EXISTS mkt_holdings_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_member_id UUID,
  security_id UUID,
  strategy_id UUID,
  symbol TEXT NOT NULL,
  quantity NUMERIC(18,6) DEFAULT 0,
  avg_fill_cents BIGINT DEFAULT 0,
  market_price_cents BIGINT DEFAULT 0,
  market_value_cents BIGINT DEFAULT 0,
  cost_basis_cents BIGINT DEFAULT 0,
  unrealized_pnl_cents BIGINT DEFAULT 0,
  as_of_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS mkt_holdings_value_unique
  ON mkt_holdings_value (
    user_id,
    security_id,
    COALESCE(strategy_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
