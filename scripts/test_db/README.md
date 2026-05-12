# Local Test Environment for Mint Data Scripts

Tests the fixed cent→rand conversion against a local Postgres database
instead of production Supabase, so no real data is affected.

## What's seeded

| Table | Data |
|---|---|
| `securities_c` | BHG.JO (71400 cents = R714), VOD.JO (16000 cents = R160) |
| `stock_returns_c` | 5 trading days Jan 2–8 2025, prices in cents |
| `strategies_c` | 1 strategy: 1× BHG.JO + 2× VOD.JO |
| `stock_holdings_c` | 1 user holding: 1 share BHG.JO, avg_fill=70000 cents (R700) |

## Expected results (if cent→rand fix is correct)

| Script | Value | Expected |
|---|---|---|
| Strategy returns | `basket_value` on 2025-01-08 | R1034 (not R103400) |
| Client returns | `basket_value` on 2025-01-08 | R714 (not R71400) |
| Client returns | `inception_pnl` on 2025-01-08 | R14 (not R1400) |

## How to run

**Terminal 1 — start the mock server:**
```bash
python3 scripts/test_db/supabase_mock.py
```

**Terminal 2 — run the test scripts:**
```bash
python3 scripts/test_db/test_strategy_returns.py
python3 scripts/test_db/test_client_returns.py
```

Each script prints PASS/FAIL against the expected values.

## Re-seeding

If you want a clean slate, run this SQL in the Replit DB console:
```sql
TRUNCATE strategies_returns_c, client_strategy_returns_c;
```
Then re-run the test scripts.
