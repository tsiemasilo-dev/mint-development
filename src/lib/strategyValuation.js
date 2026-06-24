import { supabase } from "./supabase";

// ── Single source of truth for strategy valuation ───────────────────────────
// Both the Portfolio tab (useUserStrategies) and the home card
// (SwipeableBalanceCard) — and ideally the CRM — must value a strategy the SAME
// way: live positions + cash, where cash = rebalance residual + the held 8%
// buffer, and cost basis uses the HIGHER-OF rule. Keep that logic here so it
// can't drift across components.

// Client cost basis per share (rands) = Expected_fill (the price the client saw),
// NOT higher-of(Expected, avg_fill). avg_fill (cents) carries MINT's execution
// spread, which the 8% buffer absorbs (buffer_consumed_cents) — folding it in shows
// buffer-covered slippage as a phantom loss. The upside is unaffected (we never
// credit a better-than-quoted fill above Expected). Legacy-cents guard on
// Expected_fill (rows written before the rands migration stored it ~100x inflated);
// falls back to avg_fill only when no Expected_fill was recorded. (Name kept for
// import compatibility — this is now Expected-preferred, matching the CRM + server.)
export const higherOfCostPerShareRands = (h) => {
  const avgFillRands = Number(h?.avg_fill || 0) / 100;
  const expectedRaw = Number(h?.Expected_fill ?? h?.expected_fill ?? 0);
  const expectedRands = expectedRaw > 0
    ? (expectedRaw > avgFillRands * 5 ? expectedRaw / 100 : expectedRaw)
    : 0;
  return expectedRands > 0 ? expectedRands : avgFillRands;
};

// Remaining buffer for a transaction (cents): charged 8% reserve minus the
// slippage already consumed.
export const txnBufferRemainingCents = (t) =>
  Number(t?.buffer_cents || 0) - Number(t?.buffer_consumed_cents || 0);

// Realised P&L per strategy in CENTS, from CLOSED positions (rebalance sells /
// replacements): Σ (avg_exit − avg_fill) × qty over is_active=false holdings.
// avg_fill & avg_exit are in cents, so (exit − fill) is cents/share → × qty = cents.
// This is the gain that's been "locked in" by selling, and must stay in the
// headline P&L so the % return doesn't drift down after a rebalance.
// scope: { userId, familyMemberId?, strategyIds? }
export async function fetchRealizedCentsByStrategy({ userId, familyMemberId = null, strategyIds = null }) {
  const realizedCentsByStrategy = {};
  try {
    let q = supabase
      .from("stock_holdings_c")
      .select("strategy_id, quantity, avg_fill, avg_exit")
      .eq("is_active", false);
    q = familyMemberId ? q.eq("family_member_id", familyMemberId) : q.eq("user_id", userId).is("family_member_id", null);
    if (Array.isArray(strategyIds) && strategyIds.length) q = q.in("strategy_id", strategyIds);
    const { data } = await q;
    (data || []).forEach((r) => {
      if (!r?.strategy_id) return;
      const fill = Number(r.avg_fill || 0);
      const exit = Number(r.avg_exit || 0);
      const qty = Number(r.quantity || 0);
      if (!fill || !exit || !qty) return; // only fully-priced closed lots
      realizedCentsByStrategy[r.strategy_id] = (realizedCentsByStrategy[r.strategy_id] || 0) + (exit - fill) * qty;
    });
  } catch (e) {
    console.warn("[strategyValuation] realized fetch failed:", e?.message || e);
  }
  return realizedCentsByStrategy;
}

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
    // AUM management fee already taken from the sleeve reduces the held 8% buffer.
    // Tracked in its own accumulator so it never mixes with broker slippage
    // (buffer_consumed_cents). Subtract per strategy.
    try {
      let aumQ = supabase.from("strategy_aum_fee_state").select("strategy_id, aum_fee_consumed_cents").in("strategy_id", strategyIds);
      aumQ = familyMemberId ? aumQ.eq("family_member_id", familyMemberId) : aumQ.eq("user_id", userId).is("family_member_id", null);
      const { data: aumRows } = await aumQ;
      (aumRows || []).forEach((r) => {
        if (!r?.strategy_id) return;
        bufferCentsByStrategy[r.strategy_id] = (bufferCentsByStrategy[r.strategy_id] || 0) - Number(r.aum_fee_consumed_cents || 0);
      });
    } catch (e) { /* table may not exist yet — sleeve unchanged */ }
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
