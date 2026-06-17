---
name: Portfolio tab period P&L source-of-truth
description: How 5D/M/YTD P&L is computed in useStrategyLivePeriodReturn to match the home card exactly
---

## Rule
`useStrategyLivePeriodReturn` (src/lib/useUserStrategies.js) must use `stock_holdings_c.market_value` (the held-refresh-updated column) for the live positions total — NOT `stock_intraday_c.current_price × qty` batched without ordering.

**Why:** The `/api/user/holdings` endpoint (used by the home card) computes `market_value` as `stock_intraday_c.current_price × quantity` per security with `.order("timestamp", desc).limit(1)`. A batch `stock_intraday_c` query without per-security ordering returns arbitrary/stale rows, causing the live total to differ by ~R48 from the home card. Reading `stock_holdings_c.market_value` directly gives the same value (held-refresh writes it from the same intraday source every 15s).

**How to apply:**
- Hook Step 1: `.select("transaction_id, market_value")` from `stock_holdings_c` with `is_active=true`
- Live positions: `sum(h.market_value)` (already cents)
- No need to fetch `stock_intraday_c` at all
- Anchor computation (5D/M): use `client_strategy_returns_c.basket_value` with `FETCH_LIMIT = rowLimit * 4 + 15` rows descending, trading-day-filter, cash-adjusted (`totalBufferCents + residualCentsFromDate`)
- YTD: `liveTotalRands - investedAmount`

## Confirmed values (2026-06-17)
- Home card anchor `anchorTotalCents = 328009` (5D, anchor date 2026-06-09)
- Both hook and home card use the same anchor — the trading-day basket query is correct
- Root cause of discrepancy was ONLY the live price source, not the anchor logic
