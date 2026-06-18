---
name: Fee config Express route
description: Why /api/fees-config must be registered in both Express and as a Vercel function, and where live fee values live.
---

# Fee Config Express Route

## The rule
`/api/fees-config` must be registered in `server/index.cjs` (Express) AND exist as `api/fees-config.js` (Vercel). Without the Express route, the dev environment 404s and the client falls back to hardcoded `FEE_DEFAULTS` — ignoring everything the CRM set.

**Why:** The Vite dev server proxies `/api/*` to Express on port 3001. `api/fees-config.js` is a Vercel serverless handler — it's never executed by Express. So without a matching `app.get('/api/fees-config', ...)` in `server/index.cjs`, all dev/Replit traffic gets a 404 and the UI shows stale hardcoded fees.

**How to apply:** Any new `api/*.js` Vercel function that the frontend calls must also have a matching route in `server/index.cjs` for dev/Replit to work.

## Live fee source
Fees are stored in `app_settings` (Supabase), row `key = 'fees'`, JSONB `value` with camelCase fields:
- `executionReserveRate`, `brokerFeeRate`, `isinFeePerAsset`, `transactionFeeRate`, `rebBrokerageRate`, `rebCustodyFee`

The CRM (updated 2026-06-17 by lulamasw@gmail.com) set values significantly different from the hardcoded defaults:
- `isinFeePerAsset`: 25 (hardcoded default was 69)
- `transactionFeeRate`: 0.01 / 1% (hardcoded default was 0.038 / 3.8%)
- `rebCustodyFee`: 34.5 (hardcoded default was 69)
- `monthlyStrategyFee`: 29 (new field, no hardcoded equivalent)
