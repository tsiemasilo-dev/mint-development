---
name: Portfolio chart-badge consistency
description: How to keep 5D/M/YTD chart endpoint and badge P&L in sync on the portfolio tab
---

## Rule
For the portfolio tab (NewPortfolioPage.jsx), 5D/M/YTD chart data AND badge P&L must both be derived from `client_strategy_returns_c.basket_value` row deltas. Never mix sources.

## Why
The pre-computed columns `5d_pnl`, `1m_pnl`, `ytd_pnl` in `client_strategy_returns_c` are written by a background job and go stale. The cumulative `1d_pnl` sums used by `useStrategyChartData` are a separate calculation. These two disagree significantly (e.g. badge -R74 vs chart -R4). Using `basket_value` deltas for both guarantees the chart's last point equals the badge number.

## How to apply
- `snapshotChartData` useMemo: slice last 5/22 rows (or year-to-date rows) from `snapshotRows`, compute `(basket_value - first_basket_value) / 100` per point.
- `derivedPeriodReturn` useMemo: same slice, same math for the scalar pnl/pct shown in the badge.
- `displayChartData`: use `snapshotChartData` for 5D/M/YTD tabs; fall back to `currentChartData` (from `useStrategyChartData`) only for ALL tab.
- Do NOT use `periodReturnData` (from `useStrategyPeriodReturns`) for badge when chart uses basket_value — they will diverge.
