-- Add store_reference to stock_holdings_c so every holdings row can be tied
-- back to the originating order in `transactions`.
--
-- Why:
--   Currently we group strategy/stock purchase batches by `created_at` rounded
--   to the minute. That heuristic is fragile (minute-boundary edge cases) and
--   provides no authoritative join key between transactions and the holdings
--   rows they created. Adding store_reference fixes both:
--     - HomePage's "best performing strategies" can group by store_reference
--     - Authoritative purchase date comes from transactions.transaction_date
--     - Works uniformly for direct stocks and strategies
--
-- store_reference matches transactions.store_reference (Paystack / EFT / gift /
-- wallet ref). It is NOT a foreign key constraint because a single transaction
-- creates many holdings rows (strategy components) and the transactions row
-- may be inserted in a different code path; we want soft linkage, not strict.

BEGIN;

ALTER TABLE public.stock_holdings_c
  ADD COLUMN IF NOT EXISTS store_reference text;

-- Index for the JOIN/GROUP BY usage on HomePage.
CREATE INDEX IF NOT EXISTS stock_holdings_c_store_reference_idx
  ON public.stock_holdings_c (store_reference);

COMMIT;

-- ── Backfill plan for existing rows ─────────────────────────────────────────
-- Old rows (inserted before this migration) will have NULL store_reference.
-- Two safe options for backfill:
--
-- 1) Leave NULL. The frontend falls back to created_at-minute grouping for
--    NULL rows, so nothing breaks visually. New purchases get the new key.
--
-- 2) Backfill from transactions by joining on (user_id, family_member_id,
--    created_at within ~5 seconds of transactions.created_at). Approximate
--    and only worth it if we need historical analytics on per-order grouping.
--    Sketch:
--
--    UPDATE public.stock_holdings_c h
--    SET store_reference = t.store_reference
--    FROM public.transactions t
--    WHERE h.store_reference IS NULL
--      AND h.user_id = t.user_id
--      AND COALESCE(h.family_member_id::text, '') = COALESCE(t.family_member_id::text, '')
--      AND ABS(EXTRACT(EPOCH FROM (h.created_at - t.created_at))) < 5
--      AND t.direction = 'debit'
--      AND (t.name ILIKE 'Strategy Investment:%' OR t.name ILIKE 'Purchased%');
--
-- Run option 2 only after confirming on a sample query.
