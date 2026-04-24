-- Backfill fees_breakdown for existing fee transactions
-- This script estimates the fees breakdown for past transactions that don't have it yet

UPDATE transactions
SET fees_breakdown = jsonb_build_object(
  'bufferedBase', ROUND(
    (((amount::numeric / 100) - 345) / (0.0025 + 0.038)::numeric)::numeric,
    2
  ),
  'brokerAmount', ROUND(
    ((((amount::numeric / 100) - 345) / (0.0025 + 0.038)::numeric) * 0.0025)::numeric,
    2
  ),
  'isinTotal', 345,
  'transactionAmount', ROUND(
    ((((amount::numeric / 100) - 345) / (0.0025 + 0.038)::numeric) * 0.038)::numeric,
    2
  ),
  'totalFees', ROUND((amount::numeric / 100)::numeric, 2),
  'backfilled', true
)
WHERE
  (name ILIKE '%Fees: Strategy%' OR name ILIKE '%Fees: Stock%')
  AND fees_breakdown IS NULL
  AND amount > 0;

-- Log the results
SELECT
  COUNT(*) as total_updated,
  ROUND(AVG((fees_breakdown->>'totalFees')::numeric), 2) as avg_fees,
  ROUND(SUM((fees_breakdown->>'totalFees')::numeric), 2) as total_fees_backfilled
FROM transactions
WHERE
  (name ILIKE '%Fees: Strategy%' OR name ILIKE '%Fees: Stock%')
  AND (fees_breakdown->>'backfilled')::boolean = true;
