// Single source of truth for purchase fee math. The frontend mirrors these
// values for DISPLAY only — the server recomputes and is authoritative.
//
// Fee values are now CTO-tunable via the `app_settings` table — the row keyed
// 'fees' holds a JSONB value with all fee fields (one settings table for the
// whole app; future settings are new keys/rows). getFeeConfig() reads it
// (cached, service-role) and falls back to the hardcoded defaults below if the
// row/table is missing — so nothing breaks before the table exists.
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
  REB_BROKERAGE_RATE:     0.005,  // CRM rebalance brokerage (0.5%)
  REB_CUSTODY_FEE:        69,     // CRM rebalance custody (per ISIN, per client)
};

// Map the `app_settings('fees').value` JSONB → the FEE_CONSTANTS shape. JSONB
// keys are camelCase; values aren't DB-type-checked, so coerce + fall back here.
function feesJsonToConstants(j) {
  if (!j || typeof j !== "object") return null;
  const num = (v, d) => (v == null || v === "" || isNaN(Number(v)) ? d : Number(v));
  return {
    EXECUTION_RESERVE_RATE: num(j.executionReserveRate, FEE_CONSTANTS.EXECUTION_RESERVE_RATE),
    BROKER_FEE_RATE:        num(j.brokerFeeRate,        FEE_CONSTANTS.BROKER_FEE_RATE),
    ISIN_FEE_PER_ASSET:     num(j.isinFeePerAsset,      FEE_CONSTANTS.ISIN_FEE_PER_ASSET),
    TRANSACTION_FEE_RATE:   num(j.transactionFeeRate,   FEE_CONSTANTS.TRANSACTION_FEE_RATE),
    REB_BROKERAGE_RATE:     num(j.rebBrokerageRate,     FEE_CONSTANTS.REB_BROKERAGE_RATE),
    REB_CUSTODY_FEE:        num(j.rebCustodyFee,        FEE_CONSTANTS.REB_CUSTODY_FEE),
  };
}

let _cfgCache = null;
let _cfgCacheAt = 0;
const CFG_TTL_MS = 60_000; // 1 min — fee changes propagate within a minute

// Read the current platform fee config from app_settings('fees') (cached).
// `db` is a Supabase client (service-role preferred). Never throws — returns
// defaults on any problem (incl. before the table/row exists).
export async function getFeeConfig(db) {
  const now = Date.now();
  if (_cfgCache && now - _cfgCacheAt < CFG_TTL_MS) return _cfgCache;
  try {
    const { data } = await db.from("app_settings").select("value").eq("key", "fees").maybeSingle();
    const mapped = feesJsonToConstants(data?.value);
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
