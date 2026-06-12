// Single source of truth for purchase fee math. The frontend mirrors these
// values for DISPLAY only — the server recomputes and is authoritative.
//
// Fee values are now CTO-tunable via the `platform_fee_config` table (one row,
// id=1). getFeeConfig() reads it (cached, service-role) and falls back to the
// hardcoded defaults below if the row/table is missing — so nothing breaks
// before the table exists.
//
// "Execution Reserve" is the user-facing name for the 8% slippage buffer.
// All breakdown values are returned in cents to match the transactions schema.

// Defaults (used by computeFees when no config is passed, and as the fallback
// when the DB config is unavailable). The first four feed computeFees; the rest
// are platform-wide fee values surfaced for display / the CRM rebalance engine.
export const FEE_CONSTANTS = {
  EXECUTION_RESERVE_RATE: 0.08,
  BROKER_FEE_RATE:        0.0025,
  ISIN_FEE_PER_ASSET:     69,
  TRANSACTION_FEE_RATE:   0.038,
  MONTHLY_STRATEGY_FEE:   29,     // R29/mo per additional strategy
  REB_BROKERAGE_RATE:     0.005,  // CRM rebalance brokerage (0.5%)
  REB_CUSTODY_FEE:        69,     // CRM rebalance custody (per ISIN, per client)
};

// Map a `platform_fee_config` DB row → the FEE_CONSTANTS shape.
function rowToConstants(row) {
  if (!row) return null;
  const num = (v, d) => (v == null || v === "" || isNaN(Number(v)) ? d : Number(v));
  return {
    EXECUTION_RESERVE_RATE: num(row.execution_reserve_rate, FEE_CONSTANTS.EXECUTION_RESERVE_RATE),
    BROKER_FEE_RATE:        num(row.broker_fee_rate,        FEE_CONSTANTS.BROKER_FEE_RATE),
    ISIN_FEE_PER_ASSET:     num(row.isin_fee_per_asset,     FEE_CONSTANTS.ISIN_FEE_PER_ASSET),
    TRANSACTION_FEE_RATE:   num(row.transaction_fee_rate,   FEE_CONSTANTS.TRANSACTION_FEE_RATE),
    MONTHLY_STRATEGY_FEE:   num(row.monthly_strategy_fee,   FEE_CONSTANTS.MONTHLY_STRATEGY_FEE),
    REB_BROKERAGE_RATE:     num(row.reb_brokerage_rate,     FEE_CONSTANTS.REB_BROKERAGE_RATE),
    REB_CUSTODY_FEE:        num(row.reb_custody_fee,        FEE_CONSTANTS.REB_CUSTODY_FEE),
  };
}

let _cfgCache = null;
let _cfgCacheAt = 0;
const CFG_TTL_MS = 60_000; // 1 min — fee changes propagate within a minute

// Read the current platform fee config (cached). `db` is a Supabase client
// (service-role preferred). Never throws — returns defaults on any problem.
export async function getFeeConfig(db) {
  const now = Date.now();
  if (_cfgCache && now - _cfgCacheAt < CFG_TTL_MS) return _cfgCache;
  try {
    const { data } = await db.from("platform_fee_config").select("*").eq("id", 1).maybeSingle();
    const mapped = rowToConstants(data);
    if (mapped) { _cfgCache = mapped; _cfgCacheAt = now; return mapped; }
  } catch { /* fall through to defaults */ }
  return { ...FEE_CONSTANTS };
}

// baseRands = raw investment value (no reserve, no fees)
// numAssets = count of underlying securities (1 for direct stock, N for strategy basket)
// constants = fee values to use (defaults to FEE_CONSTANTS; pass getFeeConfig() result for live config)
export function computeFees(baseRands, numAssets = 1, constants = FEE_CONSTANTS) {
  const c = constants || FEE_CONSTANTS;
  const base = Number(baseRands) || 0;
  const n = Math.max(1, Math.floor(Number(numAssets) || 1));

  const baseCents           = Math.round(base * 100);
  const bufferCents         = Math.round(base * c.EXECUTION_RESERVE_RATE * 100);
  const bufferedBase        = base * (1 + c.EXECUTION_RESERVE_RATE);
  const brokerFeeCents      = Math.round(bufferedBase * c.BROKER_FEE_RATE * 100);
  const isinFeeCents        = Math.round(c.ISIN_FEE_PER_ASSET * n * 100);
  const transactionFeeCents = Math.round(bufferedBase * c.TRANSACTION_FEE_RATE * 100);
  const totalCents          = baseCents + bufferCents + brokerFeeCents + isinFeeCents + transactionFeeCents;

  return { baseCents, bufferCents, brokerFeeCents, isinFeeCents, transactionFeeCents, totalCents };
}
