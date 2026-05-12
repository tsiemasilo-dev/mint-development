-- ============================================================
-- Neon test database schema for Mint Finance
-- Run this in the Neon SQL editor before running the scripts.
-- ============================================================

-- ── securities_c ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS securities_c (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      TEXT NOT NULL UNIQUE,
  name        TEXT,
  last_price  BIGINT,           -- price in cents (JSE/Yahoo)
  exchange    TEXT,
  sector      TEXT,
  industry    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── stock_returns_c ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_returns_c (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol        TEXT NOT NULL,
  as_of_date    DATE NOT NULL,
  current_price BIGINT,         -- price in cents
  "1d_pct"      DOUBLE PRECISION,
  "5d_pct"      DOUBLE PRECISION,
  "1m_pct"      DOUBLE PRECISION,
  "6m_pct"      DOUBLE PRECISION,
  ytd_pct       DOUBLE PRECISION,
  "1y_pct"      DOUBLE PRECISION,
  "5y_pct"      DOUBLE PRECISION,
  all_pct       DOUBLE PRECISION,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (symbol, as_of_date)
);

-- ── stock_intraday_c ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_intraday_c (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol        TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  current_price BIGINT,         -- price in cents
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (symbol, timestamp)
);

-- ── strategies_c ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategies_c (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT,
  description    TEXT,
  min_investment NUMERIC,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── strategies_returns_c ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategies_returns_c (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id   UUID NOT NULL REFERENCES strategies_c(id),
  as_of_date    DATE NOT NULL,
  basket_value  NUMERIC,        -- rand value (already /100)
  inception_pnl NUMERIC,
  "1d_pnl"      NUMERIC,
  "5d_pnl"      NUMERIC,
  "1m_pnl"      NUMERIC,
  "6m_pnl"      NUMERIC,
  ytd_pnl       NUMERIC,
  "1y_pnl"      NUMERIC,
  "5y_pnl"      NUMERIC,
  all_pnl       NUMERIC,
  "1d_pct"      DOUBLE PRECISION,
  "5d_pct"      DOUBLE PRECISION,
  "1m_pct"      DOUBLE PRECISION,
  "6m_pct"      DOUBLE PRECISION,
  ytd_pct       DOUBLE PRECISION,
  "1y_pct"      DOUBLE PRECISION,
  "5y_pct"      DOUBLE PRECISION,
  all_pct       DOUBLE PRECISION,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (strategy_id, as_of_date)
);

-- ── stock_holdings_c ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_holdings_c (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  strategy_id UUID REFERENCES strategies_c(id),
  security_id UUID REFERENCES securities_c(id),
  quantity    NUMERIC,
  avg_fill    BIGINT,           -- fill price in cents
  avg_exit    BIGINT,           -- exit price in cents
  fill_date   DATE,
  exit_date   DATE,
  is_active   BOOLEAN DEFAULT true,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── client_strategy_returns_c ─────────────────────────────────
CREATE TABLE IF NOT EXISTS client_strategy_returns_c (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  strategy_id    UUID REFERENCES strategies_c(id),
  as_of_date     DATE NOT NULL,
  inception_cost NUMERIC,
  inception_pnl  NUMERIC,
  "1d_pnl"       NUMERIC,
  "5d_pnl"       NUMERIC,
  "1m_pnl"       NUMERIC,
  "6m_pnl"       NUMERIC,
  ytd_pnl        NUMERIC,
  "1y_pnl"       NUMERIC,
  "5y_pnl"       NUMERIC,
  "1d_pct"       DOUBLE PRECISION,
  "5d_pct"       DOUBLE PRECISION,
  "1m_pct"       DOUBLE PRECISION,
  "6m_pct"       DOUBLE PRECISION,
  ytd_pct        DOUBLE PRECISION,
  "1y_pct"       DOUBLE PRECISION,
  "5y_pct"       DOUBLE PRECISION,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, strategy_id, as_of_date)
);
