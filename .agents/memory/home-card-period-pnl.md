---
name: Home card 5D/M period P&L methodology
description: How the home balance card computes 5D and M P&L after the rebalance-correction bug fix.
---

## Rule
SwipeableBalanceCard.jsx now computes 5D and M P&L using basket_value deltas
(last N rows from client_strategy_returns_c), identical to the portfolio tab.
No client-side injection correction is applied.

**Why:** The previous approach read stored `5d_pnl`/`1m_pnl` columns and then
subtracted the cost basis of any holding bought after the anchor date ("injection
correction"). This misfired on rebalance trades (REBALANCE_SELL + paired buy),
double-deducting the rebalance buy's cost basis (e.g. -R691 instead of -R201
for Rufaro Mapanda, Jun 2026 Yield Basket rebalance CLI.JO → ABG.JO).

**How to apply:**
- `runParentSnapshots` effect fetches last `rowLimit` rows (5 for 5D, 22 for M)
- Oldest row = anchor; `setParentSnapshotStartBasketCents(anchorBasket)`
- Render: `periodReturn = displayMarketValue - anchorBasket/100`
- `parentStoredMDPnl` / `parentStoredMDPct` are never set → always null →
  render falls through to `parentMDBasketPnl` (basket-delta) automatically
- basket_value already captures rebalances and top-ups; no correction needed

## Known methodology gap
The basket-delta anchor (Nth row back in the DB) differs from the server's
stored `5d_pnl` which uses a 9-calendar-day lookback. For Rufaro in Jun 2026
this was ~R45 difference (-R246 basket-delta vs -R201 stored). This is
expected and not a bug — both screens now agree with each other.

## Affected state variables
- `parentSnapshotStartBasketCents` — set; drives the basket-delta periodReturn
- `parentStoredMDPnl` / `parentStoredMDPct` — declared but never set (null)
- `parentMDInsufficientData` — set true when < rowLimit rows exist (new investor)
