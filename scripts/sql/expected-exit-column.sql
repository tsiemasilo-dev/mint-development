-- Expected exit price (per share, CENTS) — the live price the client saw when
-- they tapped Sell. Mirrors Expected_fill (buy cost basis) for the sell side:
-- the client is credited at THIS price; MINT keeps the spread vs avg_exit.
-- Run in the Supabase SQL editor.
ALTER TABLE public.stock_holdings_c
  ADD COLUMN IF NOT EXISTS expected_exit bigint;
