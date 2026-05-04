"use strict";

const DDL = `
  CREATE TABLE IF NOT EXISTS strategy_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    strategy_id      UUID NOT NULL,
    strategy_name    TEXT,
    next_billing_date DATE NOT NULL,
    amount_cents     INTEGER NOT NULL DEFAULT 2900,
    status           TEXT NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, strategy_id)
  );
`;

async function runStrategySubscriptionMigration(pgPool) {
  if (!pgPool) {
    console.warn("[strategy-sub-migration] No pgPool — skipping");
    return;
  }
  let client;
  try {
    client = await pgPool.connect();
    await client.query(DDL);
    console.log("[strategy-sub-migration] strategy_subscriptions table ready");
  } catch (e) {
    console.error("[strategy-sub-migration] Migration failed:", e.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = { runStrategySubscriptionMigration };
