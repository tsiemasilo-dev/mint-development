---
name: Securities price units (cents)
description: securities_c.last_price and stock_holdings_c.avg_fill are stored in CENTS — must divide by 100 for any Rand-denominated math/display
---

# Securities price units are CENTS

`securities_c.last_price` and `stock_holdings_c.avg_fill` are stored in **cents**
(e.g. MTN.JO `last_price` = 21522 means R215.22). `client_strategy_returns_c.basket_value`
is also in cents.

**Rule:** any Rand value derived from these must divide by 100:
`balance = quantity * (last_price / 100)`.

**Why:** the portfolio-backed Instant Liquidity / credit feature dropped the `/100`
and showed borrowing power 100x too high (a user saw ~R154,930 instead of ~R1,549).
The same mistake recurred independently in the InstantLiquidity balance calc and in
ActiveLiquidity's live-collateral LTV + pledged-asset breakdown. It's an easy trap
because the numbers still "look like money."

**How to apply:** when touching credit/liquidity/portfolio value math, confirm every
`quantity * last_price` (or avg_fill) divides by 100. DB-persisted financial fields
(`pbc_collateral_pledges.pledged_value`, `recognised_value`, `loan_application.principal_amount`)
are stored in **Rands** — do NOT divide those again.
