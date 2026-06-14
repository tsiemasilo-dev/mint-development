---
name: Holdings is_active dedup in balance card
description: Why the balance card dedup guard exists and when it fires.
---

## Rule
After fetching `/api/user/holdings`, the balance card (`SwipeableBalanceCard.jsx`) applies a dedup guard before the strategy-grouping block. For any `(security_id, strategy_id)` pair that has **at least one** `is_active = true` row, all `is_active = null` rows for that pair are dropped.

## Why
A rebalance can create new `stock_holdings_c` rows (marked `is_active = true`) without deactivating the old ones (left as `is_active = null`). Both pass the server-side filter `Status = 'active'` and the client filter `is_active !== false`, causing the same position to be counted twice → portfolio value exactly 2×.

The dedup is intentionally conservative:
- When **all** rows for a position are `is_active = null` (normal first purchase, no rebalance), the guard is a no-op and all rows are kept.
- When there is **a mix** of `null` and `true`, only `true` rows are kept.
- Multiple `is_active = true` rows for the same position (top-up purchase after rebalance) are all kept.

## How to apply
- This dedup lives only in the **parent mode** path of the balance card's `fetchHoldings` effect (inside the `else` block, right before the strategy-grouping section).
- `useUserStrategies.js` is unaffected — it already queries with `.eq("is_active", true)`.
- `fetchStrategyCashCents` is unaffected — it already queries with `.eq("is_active", true)`.
- `useFinancialData.js` / `aggregateHoldings` does **not** apply this dedup, so `investments` / `bestAssets` may still double for affected users, but those values do not drive the portfolio value header.
