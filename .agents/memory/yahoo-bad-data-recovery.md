---
name: Yahoo bad-data incident recovery
description: Playbook for fixing corrupted EOD stock prices from Yahoo Finance glitches, and how the anomaly guard works.
---

## What happened (Jun 26, 2026)
Yahoo Finance returned corrupt prices at 14:08 UTC for multiple JSE securities. The intraday refresh saved these to `stock_intraday_c`, then the EOD cron at 15:05 UTC snapshotted them into `stock_returns_c`. This caused strategy factsheet charts to show a cliff-dive for any strategy holding these securities.

## Detection pattern
- Strategy factsheet charts show a sudden cliff on today's date
- `stock_returns_c` for today deviates >20% from the prior trading day
- `stock_intraday_c` has a batch of bad rows clustered at the same timestamp (e.g. all at 14:08 UTC)
- Prior intraday entries (same day, earlier time) show normal prices

## Fix playbook
1. **Identify bad securities**: compare `stock_returns_c` today vs prior trading day; flag any >20% single-day move.
2. **Fix `stock_returns_c`**: UPDATE today's `current_price` to the prior trading day's value for each bad security. If Yahoo later self-corrects (within the trading session), the EOD cron on the next restart will overwrite with the real price.
3. **Clean `stock_intraday_c`**: DELETE rows for those `security_id`s with `timestamp >= <bad_batch_time>`. Only delete the specific bad window — don't delete good intraday data from earlier in the day.
4. **Retrigger strategy returns**: restart the server; `computeAndSaveStrategyReturns` fires automatically 60 seconds after startup, recomputing all period percentages in `strategies_returns_c`.

## Key architecture facts
- `getStrategyPriceHistory` (factsheet charts) calls `getSecurityPrices(secId, timeframe)` **without symbol** → always queries `stock_returns_c` (NOT Yahoo). So fixing the DB directly fixes the chart.
- `getSecurityPrices` with `symbol` → tries Yahoo first, falls back to DB. Individual security charts use Yahoo.
- `strategies_returns_c` holds pre-computed period returns (YTD/5D/1M/6M). Computed by `computeAndSaveStrategyReturns` at: server startup +60s, 07:00 UTC Mon-Fri, 15:30 UTC Mon-Fri.
- EOD cron runs at 15:05 UTC Mon-Fri AND re-runs at server restart (within 60s of startup). So restarting after Yahoo corrects its data causes the EOD to overwrite any manual DB fix with the correct Yahoo price.
- `stock_returns_c` is the chart's source of truth. `stock_intraday_c` is only used for 1D intraday charts and the strategy returns calculation's "current price" anchor.

## Anomaly guard (server/index.cjs `fetchYahooPrice`)
- Threshold: **20%** from `prevClose` (Yahoo's own `chartPreviousClose` or `regularMarketPrice`)
- Any intraday price deviating >20% from prev close is rejected and returns `null`
- The EOD cron calls `fetchYahooPrice`; if rejected, the security is skipped (no update to `stock_returns_c` that run)
- Previously 40%, lowered to 20% after EXX.JO (-28%) and GRT.JO (-25.5%) were missed

**Why:** JSE stocks don't legitimately move >20% in a single session under normal circumstances. Corporate actions (dividends, splits) that would cause >20% moves are rare and should be handled manually.

## South Africa public holidays affect trading
- JSE does not trade on SA public holidays. Jun 25, 2026 was a holiday — the "prior trading day" was Jun 24 (Wednesday), not Jun 25.
- Always use the most recent row in `stock_returns_c` as the reference, not a hardcoded offset like "yesterday".
