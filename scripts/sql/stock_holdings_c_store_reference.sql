-- Add transaction_id to stock_holdings_c so every holdings row is tied
-- back to the originating order in `transactions` via a FK.
--
-- Why transaction_id instead of store_reference (text):
--   - UUID is guaranteed unique — no format variations, no collisions
--   - FK constraint gives referential integrity
--   - Clean typed JOIN: stock_holdings_c.transaction_id = transactions.id
--   - Frontend can group/batch purchases by transaction_id directly
--
-- Nullable because:
--   - A single transaction creates many holdings rows (strategy components)
--   - Legacy rows have no matching transaction to point at
--   - The frontend falls back to created_at-minute for NULL rows

BEGIN;

ALTER TABLE public.stock_holdings_c
  ADD COLUMN IF NOT EXISTS transaction_id uuid
    REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Index for the JOIN/GROUP BY usage.
CREATE INDEX IF NOT EXISTS stock_holdings_c_transaction_id_idx
  ON public.stock_holdings_c (transaction_id);

COMMIT;

-- ── Backfill plan for existing rows ─────────────────────────────────────────
-- Old rows will have transaction_id = NULL.
-- The frontend falls back to created_at-minute grouping for NULL rows, so
-- nothing breaks visually. New purchases get the FK populated automatically.
--
-- Optional approximate backfill (run only after validating on a sample):
--
-- UPDATE public.stock_holdings_c h
-- SET transaction_id = t.id
-- FROM public.transactions t
-- WHERE h.transaction_id IS NULL
--   AND h.user_id = t.user_id
--   AND COALESCE(h.family_member_id::text, '') = COALESCE(t.family_member_id::text, '')
--   AND ABS(EXTRACT(EPOCH FROM (h.created_at - t.created_at))) < 5
--   AND t.direction = 'debit'
--   AND (t.name ILIKE 'Strategy Investment:%' OR t.name ILIKE 'Purchased%');
