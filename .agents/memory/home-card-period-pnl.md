---
name: Home card period P&L fix
description: How SwipeableBalanceCard computes 5D/M/YTD/ALL P&L correctly — anchors, cash, and cost-basis.
---

## Rules

### 5D and M filters
- Fetch 4× more snapshot rows than needed (FETCH_LIMIT = rowLimit * 4 + 15) from `client_strategy_returns_c`.
- Filter non-trading days client-side: drop rows where `basket_value == previous row's basket_value` (weekends, SA public holidays like Youth Day Jun 16).
- Anchor = tradingDates[tradingDates.length - 1 - rowLimit] (Nth real trading day before today's row).
- Add cash at anchor date: buffer always; residual only if `earliestResidualDateStr <= anchorDate`.
- Store in `parentSnapshotStartBasketCents` = anchorBasketCents + anchorCashCents.
- `parentMDBasketPnl = displayMarketValue - anchorTotal/100` — both sides now cash-inclusive so the diff is pure price movement.

**Why:** Old code used raw row count (including non-trading days), anchoring too late, and the anchor was positions-only while today includes buffer+residual — creating a phantom cash gap that inflated every period.

### YTD and ALL filters
- Use cost-basis approach: query `stock_holdings_c WHERE transaction_id IS NOT NULL` — captures only user-deposit positions (both active and closed original buys like CLI.JO).
- Excludes rebalance-created replacements (ABG.JO has no transaction_id) to avoid double-counting capital.
- `costBasisCents = sum(avg_fill × qty) + totalBufferCents`.
- Stored in `parentYearStartBasketCents`; `useParentLiveYtd` now covers "all" tab too.
- `parentYtdReturn = Math.min(displayMarketValue - costBasis/100, displayReturn)` — capped at all-time to handle edge cases.

**Why:** Prior approach used first-of-year basket (positions-only, no cash) as anchor, which inflated YTD by the full buffer+residual amount. The chart effect's YTD block also raced against the snapshot effect — it was removed; snapshot effect is the sole setter.

### Cash at anchor date
- `totalBufferCents` = sum(buffer_cents - buffer_consumed_cents) from transactions linked to active holdings.
- `totalResidualCents` = sum(balance_cents) from `strategy_rebalance_residuals`.
- `earliestResidualDateStr` = earliest `updated_at` date from residuals — residual only added to anchor if rebalance ≤ anchor date.

## Expected values (Rufaro, Yield Basket, Jun 17 2026)
- 5D: -R59.95 (-0.8%)   anchor Jun 09
- 1M: +R197.95 (+2.7%)  anchor May 13
- YTD: +R333.61 (+4.7%) cost basis R7,169.97
- ALL: +R333.61 (+4.7%) same
