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

-- mkt_holdings_value: mirrors client_strategy_returns_c structure.
-- Populated by /api/update-prices — reads client_strategy_returns_c as source,
-- updates current_price from Yahoo Finance, writes live P&L here.
-- client_strategy_returns_c is NEVER written to by this pipeline.
DROP TABLE IF EXISTS mkt_holdings_value;
CREATE TABLE mkt_holdings_value (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  strategy_id       UUID,
  family_member     TEXT,
  as_of_date        DATE NOT NULL,
  basket_value      BIGINT,
  holdings_snapshot JSONB,
  "1d_pnl"          BIGINT,
  "1d_pct"          DOUBLE PRECISION,
  "5d_pnl"          BIGINT,
  "5d_pct"          DOUBLE PRECISION,
  "1m_pnl"          BIGINT,
  "1m_pct"          DOUBLE PRECISION,
  "6m_pnl"          BIGINT,
  "6m_pct"          DOUBLE PRECISION,
  "ytd_pnl"         BIGINT,
  "ytd_pct"         DOUBLE PRECISION,
  "1y_pnl"          BIGINT,
  "1y_pct"          DOUBLE PRECISION,
  "5y_pnl"          BIGINT,
  "5y_pct"          DOUBLE PRECISION,
  inception_pnl     BIGINT,
  inception_pct     DOUBLE PRECISION,
  fetched_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX mkt_holdings_value_unique
  ON mkt_holdings_value (
    user_id,
    COALESCE(strategy_id, '00000000-0000-0000-0000-000000000000'::uuid),
    as_of_date,
    COALESCE(family_member, '')
  );
