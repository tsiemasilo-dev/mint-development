import { supabase } from "./supabase";

// ── Single source of truth for strategy valuation ───────────────────────────
// Both the Portfolio tab (useUserStrategies) and the home card
// (SwipeableBalanceCard) — and ideally the CRM — must value a strategy the SAME
// way: live positions + cash, where cash = rebalance residual + the held 8%
// buffer, and cost basis uses the HIGHER-OF rule. Keep that logic here so it
// can't drift across components.

// Higher-of cost basis per share (rands). Client cost basis is Expected_fill
// (rands); avg_fill (cents) carries MINT's spread. We take the higher of the two
// so cost is never understated, with a legacy-cents guard on Expected_fill
// (rows written before the rands migration stored it ~100x inflated).
export const higherOfCostPerShareRands = (h) => {
  const avgFillRands = Number(h?.avg_fill || 0) / 100;
  const expectedRaw = Number(h?.Expected_fill ?? h?.expected_fill ?? 0);
  const expectedRands = expectedRaw > 0
    ? (expectedRaw > avgFillRands * 5 ? expectedRaw / 100 : expectedRaw)
    : 0;
  return expectedRands > 0 ? Math.max(expectedRands, avgFillRands) : avgFillRands;
};

// Remaining buffer for a transaction (cents): charged 8% reserve minus the
// slippage already consumed.
export const txnBufferRemainingCents = (t) =>
  Number(t?.buffer_cents || 0) - Number(t?.buffer_consumed_cents || 0);

// Per-strategy CASH in CENTS: held 8% buffer + rebalance residual.
//   buffer  = sum over the strategy's funding transactions of (buffer_cents −
//             buffer_consumed_cents), each transaction counted once. Transactions
//             are reached via active stock_holdings_c.transaction_id.
//   residual = strategy_rebalance_residuals.balance_cents.
// scope: { userId, familyMemberId?, strategyIds, activeHoldings? }
//   activeHoldings (optional) — pre-fetched [{ strategy_id, transaction_id }] to
//   avoid a re-query when the caller already has them.
export async function fetchStrategyCashCents({ userId, familyMemberId = null, strategyIds, activeHoldings = null, includeResidual = true }) {
  const bufferCentsByStrategy = {};
  const residualCentsByStrategy = {};
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    return { bufferCentsByStrategy, residualCentsByStrategy };
  }
  try {
    // 1) transaction_id per strategy from active holdings
    let rows = activeHoldings;
    if (!rows) {
      let q = supabase.from("stock_holdings_c").select("strategy_id, transaction_id").eq("is_active", true).in("strategy_id", strategyIds);
      q = familyMemberId ? q.eq("family_member_id", familyMemberId) : q.eq("user_id", userId).is("family_member_id", null);
      const { data } = await q;
      rows = data || [];
    }
    const txIdsByStrategy = {};
    const allTxIds = new Set();
    rows.forEach((r) => {
      if (!r?.strategy_id || !r?.transaction_id) return;
      (txIdsByStrategy[r.strategy_id] = txIdsByStrategy[r.strategy_id] || new Set()).add(r.transaction_id);
      allTxIds.add(r.transaction_id);
    });
    if (allTxIds.size > 0) {
      const { data: bufTxns } = await supabase.from("transactions").select("id, buffer_cents, buffer_consumed_cents").in("id", [...allTxIds]);
      const bufById = {};
      (bufTxns || []).forEach((t) => { bufById[t.id] = txnBufferRemainingCents(t); });
      Object.entries(txIdsByStrategy).forEach(([sid, set]) => {
        let sum = 0;
        set.forEach((tid) => { sum += bufById[tid] || 0; });
        bufferCentsByStrategy[sid] = sum;
      });
    }
    // 2) rebalance residual per strategy
    if (!includeResidual) return { bufferCentsByStrategy, residualCentsByStrategy };
    let resQ = supabase.from("strategy_rebalance_residuals").select("strategy_id, balance_cents").in("strategy_id", strategyIds);
    resQ = familyMemberId ? resQ.eq("family_member_id", familyMemberId) : resQ.eq("user_id", userId).is("family_member_id", null);
    const { data: resRows } = await resQ;
    (resRows || []).forEach((r) => { if (r.strategy_id) residualCentsByStrategy[r.strategy_id] = Number(r.balance_cents || 0); });
  } catch (e) {
    console.warn("[strategyValuation] cash fetch failed:", e?.message || e);
  }
  return { bufferCentsByStrategy, residualCentsByStrategy };
}
