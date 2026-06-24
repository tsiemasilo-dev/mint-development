// ============================================================================
// AUM Management Fee engine — daily accrual + month-end settlement.
// Spec: MINT_AUM_Fee_Spec_v1.0. 0.99% p.a. (CEO-tunable via app_settings.fees),
// actual/365 (366 in leap years), accrued daily on total strategy value V(t),
// settled on the last calendar day of each month, taken ONLY from the 8% cash
// sleeve (never sells shares). All money in CENTS.
//
// Design notes:
//  • A position = (user_id, family_member_id, strategy_id). family_member_id NULL
//    = the parent account.
//  • V(t) = Σ(live_price × qty) + cash sleeve, where sleeve = held 8% buffer
//    (Σ buffer_cents − buffer_consumed_cents over the position's funding txns)
//    + rebalance residual − AUM already consumed. Mirrors strategyValuation.js.
//  • Accrual is by ELAPSED days (today − last_accrual_date) so it's idempotent
//    (double run = 0 days) and self-healing (a missed day catches up). Because we
//    accrue on the CURRENT value each run, top-ups/withdrawals are pro-rated
//    automatically — a top-up raises V → larger daily accrual from then on; a
//    withdrawal lowers it. (Spec's segment math, achieved without per-event rows.)
//  • Low-cash protocol: deduct what the sleeve can cover, carry the rest as a
//    receivable, flag it, and charge it FIRST next month. Never sells shares.
// ============================================================================

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysInYear = (d) => (isLeap(d.getUTCFullYear()) ? 366 : 365);
const ymd = (d) => d.toISOString().slice(0, 10);
const firstOfMonth = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
const lastOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
const isLastDayOfMonth = (d) => d.getUTCDate() === lastOfMonth(d).getUTCDate();
const famKey = (fm) => fm || ZERO_UUID;
const posKey = (h) => `${h.user_id}|${famKey(h.family_member_id)}|${h.strategy_id}`;
const dayDiff = (a, b) => Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) - Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) / 86400000);

// Current configured annual rate (CEO-tunable). Falls back to 0.99%.
async function getAumRate(db) {
  try {
    const { data } = await db.from("app_settings").select("value").eq("key", "fees").maybeSingle();
    const r = Number(data?.value?.aumFeeRate);
    if (Number.isFinite(r) && r > 0) return r;
  } catch { /* fall through */ }
  return 0.0099;
}

// Live price (cents) per security: latest intraday tick, else latest EOD return.
async function livePriceMapCents(db, secIds) {
  const map = {};
  const ids = [...new Set(secIds.filter(Boolean))];
  if (!ids.length) return map;
  const { data: intra } = await db.from("stock_intraday_c")
    .select("security_id, current_price, timestamp").in("security_id", ids).order("timestamp", { ascending: false });
  (intra || []).forEach((r) => { if (r.security_id && map[r.security_id] == null && r.current_price != null) map[r.security_id] = Number(r.current_price); });
  const missing = ids.filter((id) => map[id] == null);
  if (missing.length) {
    const { data: ret } = await db.from("stock_returns_c")
      .select("security_id, current_price, as_of_date").in("security_id", missing).order("as_of_date", { ascending: false });
    (ret || []).forEach((r) => { if (r.security_id && map[r.security_id] == null && r.current_price != null) map[r.security_id] = Number(r.current_price); });
  }
  return map;
}

// Build every active position keyed by posKey, with positions value + sleeve (cents).
// scope (optional) = { userId, strategyId } — restrict to one account/strategy (UAT).
async function buildPositions(db, scope = {}) {
  let q = db.from("stock_holdings_c")
    .select("user_id, family_member_id, strategy_id, security_id, quantity, transaction_id")
    .eq("is_active", true);
  if (scope.userId) q = q.eq("user_id", scope.userId);
  if (scope.strategyId) q = q.eq("strategy_id", scope.strategyId);
  const { data: holds } = await q;
  const active = (holds || []).filter((h) => h.user_id && h.strategy_id);
  if (!active.length) return [];

  const prices = await livePriceMapCents(db, active.map((h) => h.security_id));

  // Buffer: distinct funding transactions per position.
  const txIds = [...new Set(active.map((h) => h.transaction_id).filter(Boolean))];
  const bufById = {};
  for (let i = 0; i < txIds.length; i += 300) {
    const { data: txns } = await db.from("transactions").select("id, buffer_cents, buffer_consumed_cents").in("id", txIds.slice(i, i + 300));
    (txns || []).forEach((t) => { bufById[t.id] = Number(t.buffer_cents || 0) - Number(t.buffer_consumed_cents || 0); });
  }
  // Residual + existing AUM state, keyed by position.
  const { data: resRows } = await db.from("strategy_rebalance_residuals").select("user_id, family_member_id, strategy_id, balance_cents");
  const residualByPos = {};
  (resRows || []).forEach((r) => { residualByPos[`${r.user_id}|${famKey(r.family_member_id)}|${r.strategy_id}`] = Number(r.balance_cents || 0); });
  const { data: aumRows } = await db.from("strategy_aum_fee_state").select("user_id, family_member_id, strategy_id, aum_fee_consumed_cents");
  const consumedByPos = {};
  (aumRows || []).forEach((r) => { consumedByPos[`${r.user_id}|${famKey(r.family_member_id)}|${r.strategy_id}`] = Number(r.aum_fee_consumed_cents || 0); });

  // Group holdings → positions.
  const groups = {};
  active.forEach((h) => {
    const k = posKey(h);
    const g = groups[k] || (groups[k] = { user_id: h.user_id, family_member_id: h.family_member_id || null, strategy_id: h.strategy_id, positionsCents: 0, txIds: new Set() });
    g.positionsCents += Math.round(Number(prices[h.security_id] || 0) * Number(h.quantity || 0));
    if (h.transaction_id) g.txIds.add(h.transaction_id);
  });

  return Object.entries(groups).map(([k, g]) => {
    let bufferCents = 0;
    g.txIds.forEach((tid) => { bufferCents += bufById[tid] || 0; });
    const residual = residualByPos[k] || 0;
    const consumed = consumedByPos[k] || 0;
    const sleeveCents = bufferCents + residual - consumed; // net cash sleeve right now
    return { key: k, ...g, sleeveCents, valueCents: g.positionsCents + sleeveCents };
  });
}

// ── Daily accrual ──────────────────────────────────────────────────────────
// Adds (V × rDaily × elapsedDays) to each position's open segment for the month.
async function runDailyAccrual(db, asOf = new Date(), scope = {}) {
  const rate = await getAumRate(db);
  const rDaily = rate / daysInYear(asOf);
  const periodMonth = firstOfMonth(asOf);
  const today = ymd(asOf);

  const positions = await buildPositions(db, scope);
  if (!positions.length) { console.log("[aum-accrual] no active positions"); return { accrued: 0 }; }

  // Open segments for this month, keyed by position.
  let osq = db.from("aum_fee_accrual_segments")
    .select("id, user_id, family_member_id, strategy_id, accrued_fee_cents, days_in_segment, last_accrual_date, period_month")
    .is("segment_end_date", null);
  if (scope.userId) osq = osq.eq("user_id", scope.userId);
  if (scope.strategyId) osq = osq.eq("strategy_id", scope.strategyId);
  const { data: openSegs } = await osq;
  const segByPos = {};
  (openSegs || []).forEach((s) => { segByPos[`${s.user_id}|${famKey(s.family_member_id)}|${s.strategy_id}`] = s; });

  let accruedTotal = 0, touched = 0;
  for (const p of positions) {
    if (p.valueCents <= 0) continue;
    const seg = segByPos[p.key];
    if (seg && seg.period_month === periodMonth) {
      const last = seg.last_accrual_date ? new Date(seg.last_accrual_date + "T00:00:00Z") : null;
      const elapsed = last ? dayDiff(asOf, last) : 1;
      if (elapsed <= 0) continue; // already accrued today (idempotent)
      const add = p.valueCents * rDaily * elapsed;
      await db.from("aum_fee_accrual_segments").update({
        accrued_fee_cents: Number(seg.accrued_fee_cents || 0) + add,
        days_in_segment: Number(seg.days_in_segment || 0) + elapsed,
        value_basis_cents: p.valueCents,
        last_accrual_date: today,
        updated_at: new Date().toISOString(),
      }).eq("id", seg.id);
      accruedTotal += add; touched++;
    } else {
      // No open segment for this month → open one (close any stale open seg first).
      if (seg) await db.from("aum_fee_accrual_segments").update({ segment_end_date: today }).eq("id", seg.id);
      const add = p.valueCents * rDaily * 1;
      await db.from("aum_fee_accrual_segments").insert({
        user_id: p.user_id, family_member_id: p.family_member_id, strategy_id: p.strategy_id,
        period_month: periodMonth, segment_start_date: today, value_basis_cents: p.valueCents,
        days_in_segment: 1, accrued_fee_cents: add, trigger_type: "initial", last_accrual_date: today,
      });
      accruedTotal += add; touched++;
    }
  }
  console.log(`[aum-accrual] ${today} rate=${(rate * 100).toFixed(3)}% positions=${positions.length} touched=${touched} accrued=R${(accruedTotal / 100).toFixed(2)}`);
  return { accrued: accruedTotal, touched };
}

// ── Month-end settlement ─────────────────────────────────────────────────────
// On the last calendar day: sum the month's accrual (+ any prior receivable),
// deduct from the sleeve, write the ledger + revenue roll-up, notify the client.
async function runMonthlySettlement(db, asOf = new Date(), { force = false, userId = null, strategyId = null } = {}) {
  if (!force && !isLastDayOfMonth(asOf)) { return { settled: 0, skipped: "not month-end" }; }
  const scope = { userId, strategyId };
  const periodMonth = firstOfMonth(asOf);
  const periodEnd = ymd(lastOfMonth(asOf));
  const settleDate = ymd(asOf);

  // Make sure the final day is accrued before we settle.
  await runDailyAccrual(db, asOf, scope);

  const positions = await buildPositions(db, scope);
  const posByKey = {}; positions.forEach((p) => { posByKey[p.key] = p; });

  // This month's open segments = what we settle (scoped when running a UAT test).
  let segq = db.from("aum_fee_accrual_segments")
    .select("*").is("segment_end_date", null).eq("period_month", periodMonth);
  if (userId) segq = segq.eq("user_id", userId);
  if (strategyId) segq = segq.eq("strategy_id", strategyId);
  const { data: segs } = await segq;
  if (!segs || !segs.length) { console.log("[aum-settle] nothing to settle for", periodMonth); return { settled: 0 }; }

  // Existing AUM state + strategy names for notifications.
  const { data: stateRows } = await db.from("strategy_aum_fee_state").select("*");
  const stateByPos = {}; (stateRows || []).forEach((s) => { stateByPos[`${s.user_id}|${famKey(s.family_member_id)}|${s.strategy_id}`] = s; });
  const stratIds = [...new Set(segs.map((s) => s.strategy_id))];
  const nameById = {};
  for (let i = 0; i < stratIds.length; i += 300) {
    const { data: strat } = await db.from("strategies").select("id, name").in("id", stratIds.slice(i, i + 300));
    (strat || []).forEach((s) => { nameById[s.id] = s.name; });
  }

  let aumCollectedCents = 0, settledCount = 0;
  for (const seg of segs) {
    const key = `${seg.user_id}|${famKey(seg.family_member_id)}|${seg.strategy_id}`;
    const pos = posByKey[key];
    const prior = stateByPos[key] || {};
    const priorReceivable = Number(prior.aum_fee_receivable_cents || 0);
    const accruedWhole = Math.round(Number(seg.accrued_fee_cents || 0));
    const feeDue = accruedWhole + priorReceivable;
    if (feeDue <= 0) { await db.from("aum_fee_accrual_segments").update({ segment_end_date: periodEnd, trigger_type: "month_end" }).eq("id", seg.id); continue; }

    const sleeveAvail = Math.max(0, pos ? pos.sleeveCents : 0);
    const deducted = Math.min(feeDue, sleeveAvail);
    const receivable = feeDue - deducted;
    const lowCash = receivable > 0;

    // 1) Update per-position state (consumed reduces the visible sleeve everywhere).
    const newState = {
      user_id: seg.user_id, family_member_id: seg.family_member_id, strategy_id: seg.strategy_id,
      aum_fee_consumed_cents: Number(prior.aum_fee_consumed_cents || 0) + deducted,
      aum_fee_receivable_cents: receivable,
      low_cash_flag: lowCash,
      last_settled_period: periodMonth,
      updated_at: new Date().toISOString(),
    };
    if (prior.id) await db.from("strategy_aum_fee_state").update(newState).eq("id", prior.id);
    else await db.from("strategy_aum_fee_state").insert(newState);

    // 2) Settled ledger row.
    await db.from("aum_fee_transactions").insert({
      user_id: seg.user_id, family_member_id: seg.family_member_id, strategy_id: seg.strategy_id,
      fee_type: "AUM", period_start: periodMonth, period_end: periodEnd,
      fee_amount_cents: feeDue, deducted_from_cash_cents: deducted, fee_receivable_cents: receivable,
      basis_value_cents: seg.value_basis_cents || (pos ? pos.valueCents : 0),
      segments_json: [{ period_month: seg.period_month, days: seg.days_in_segment, accrued_cents: seg.accrued_fee_cents, prior_receivable_cents: priorReceivable, value_basis_cents: seg.value_basis_cents }],
      settled_at: new Date().toISOString(),
    });

    // 3) Close the segment.
    await db.from("aum_fee_accrual_segments").update({ segment_end_date: periodEnd, trigger_type: "month_end" }).eq("id", seg.id);

    // 4) Client notification (only when something was actually deducted).
    if (deducted > 0) {
      const stratName = nameById[seg.strategy_id] || "your strategy";
      const remaining = Math.max(0, (pos ? pos.sleeveCents : 0) - deducted);
      await db.from("notifications").insert({
        user_id: seg.user_id,
        title: "Management fee deducted",
        body: `Your MINT management fee of R${(deducted / 100).toFixed(2)} was deducted from your ${stratName} cash sleeve. Remaining cash: R${(remaining / 100).toFixed(2)}.${lowCash ? ` R${(receivable / 100).toFixed(2)} will be charged when more cash is available.` : ""}`,
        type: "investment",
        payload: { action: "aum_fee_deducted", strategy_id: seg.strategy_id, period: periodMonth, amount_cents: deducted, receivable_cents: receivable },
      });
    }

    aumCollectedCents += deducted; settledCount++;
  }

  // 5) Daily revenue roll-up (upsert the settlement date).
  if (aumCollectedCents > 0) {
    const { data: existing } = await db.from("mint_revenue_daily").select("date, aum_fees_collected_cents").eq("date", settleDate).maybeSingle();
    if (existing) await db.from("mint_revenue_daily").update({ aum_fees_collected_cents: Number(existing.aum_fees_collected_cents || 0) + aumCollectedCents, updated_at: new Date().toISOString() }).eq("date", settleDate);
    else await db.from("mint_revenue_daily").insert({ date: settleDate, aum_fees_collected_cents: aumCollectedCents });
  }

  console.log(`[aum-settle] ${periodMonth} settled=${settledCount} collected=R${(aumCollectedCents / 100).toFixed(2)}`);
  return { settled: settledCount, collected: aumCollectedCents };
}

module.exports = { runDailyAccrual, runMonthlySettlement, getAumRate, buildPositions };
