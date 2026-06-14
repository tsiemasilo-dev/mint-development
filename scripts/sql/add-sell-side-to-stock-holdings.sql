-- Sell support on stock_holdings_c
-- A sell mirrors a buy: instead of a new pending row (avg_fill IS NULL), an
-- EXISTING filled holding is flipped to a pending SELL. The order book already
-- reads a `side` column, so we make it real here. Run in the Supabase SQL editor.

-- 1. side: 'buy' (the default, every existing holding) or 'sell' (a pending sell)
ALTER TABLE stock_holdings_c
  ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'buy';

-- Backfill is implicit via the DEFAULT, but be explicit for any NULLs from older rows
UPDATE stock_holdings_c SET side = 'buy' WHERE side IS NULL;

-- 2. when the client instructed the sell (for ordering / audit on the order book)
ALTER TABLE stock_holdings_c
  ADD COLUMN IF NOT EXISTS sell_requested_at timestamptz;

-- A pending sell = side='sell' AND exit not yet recorded (still Status='active').
-- Index it so the order book can pull pending sells cheaply.
CREATE INDEX IF NOT EXISTS stock_holdings_c_pending_sell_idx
  ON stock_holdings_c (side)
  WHERE side = 'sell';
