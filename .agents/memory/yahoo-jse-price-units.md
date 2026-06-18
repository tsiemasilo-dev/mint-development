---
name: Yahoo JSE price units
description: Yahoo Finance returns JSE stock prices in ZAp (cents), not ZAR (rands) — same unit as securities_c.last_price.
---

## Rule
When fetching historical prices from Yahoo Finance for `.JO` (JSE-listed) symbols, the `close` values returned are already in **ZAp (South African cents)** — the same unit as `securities_c.last_price` and `stock_intraday_c.current_price`.

**Do NOT multiply Yahoo close prices by 100.**

```js
// CORRECT — Yahoo returns ZAp (cents) for JSE stocks:
entries.push([dateStr, Math.round(c)]);

// WRONG — inflates price 100×:
entries.push([dateStr, Math.round(c * 100)]);
```

**Why:** The JSE quotes stocks in cents natively (e.g. NED.JO at R254.87 = 25487c). Yahoo follows the native market convention, returning 25487 for NED.JO — not 254.87.

**How to apply:** Any script or server code fetching Yahoo Finance `chart` or `quote` data for `.JO` symbols must use the raw close value directly as cents. Period-return ratios (e.g. 6m/1m/5d) computed entirely within Yahoo data are unaffected (bug cancels in the ratio), but cross-source comparisons (Yahoo vs. securities_c.last_price) will be 100× wrong if you multiply.

**Detected via:** A backfill script that compared Yahoo prices (multiplied ×100) against securities_c.jan1 implied prices (in cents), producing ~12,000–15,000% YTD returns instead of ~30%.
