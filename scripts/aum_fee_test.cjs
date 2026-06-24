// Offline simulation of the AUM fee engine against an in-memory mock of the
// Supabase client. Verifies the engine reproduces MINT_AUM_Fee_Spec worked
// examples (simple month, top-up proration, low-cash protocol) end-to-end.
// Run: node scripts/aum_fee_test.cjs
/* eslint-disable no-console */
const { runDailyAccrual, runMonthlySettlement } = require("../server/aumFeeEngine.cjs");

// ── Tiny in-memory mock of the Supabase query builder ───────────────────────
function makeDb(tables) {
  let _id = 1;
  const matches = (row, filters) => filters.every((f) => {
    const v = row[f.field];
    if (f.kind === "eq") return v === f.val;
    if (f.kind === "is") return f.val === null ? (v === null || v === undefined) : v === f.val;
    if (f.kind === "in") return f.val.includes(v);
    return true;
  });
  const builder = (table) => {
    const st = { table, op: "select", filters: [], patch: null, payload: null, order: null, single: false };
    const run = () => {
      const rows = tables[table] || (tables[table] = []);
      if (st.op === "insert") {
        const items = Array.isArray(st.payload) ? st.payload : [st.payload];
        const inserted = items.map((it) => ({ id: it.id || `id${_id++}`, ...it }));
        rows.push(...inserted);
        return { data: inserted, error: null };
      }
      let sel = rows.filter((r) => matches(r, st.filters));
      if (st.op === "update") { sel.forEach((r) => Object.assign(r, st.patch)); return { data: sel, error: null }; }
      if (st.order) sel = sel.slice().sort((a, b) => (st.order.asc ? 1 : -1) * (String(a[st.order.col]) < String(b[st.order.col]) ? -1 : a[st.order.col] > b[st.order.col] ? 1 : 0));
      return { data: st.single ? (sel[0] || null) : sel, error: null };
    };
    const api = {
      select() { return api; },
      insert(p) { st.op = "insert"; st.payload = p; return api; },
      update(p) { st.op = "update"; st.patch = p; return api; },
      eq(field, val) { st.filters.push({ kind: "eq", field, val }); return api; },
      is(field, val) { st.filters.push({ kind: "is", field, val }); return api; },
      in(field, val) { st.filters.push({ kind: "in", field, val }); return api; },
      order(col, opt) { st.order = { col, asc: !!(opt && opt.ascending) }; return api; },
      maybeSingle() { st.single = true; return Promise.resolve(run()); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return api;
  };
  return { from: (t) => builder(t) };
}

const R = (cents) => "R" + (cents / 100).toFixed(2);
let pass = 0, fail = 0;
const assertNear = (label, got, want, tol = 1) => {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? "✓" : "✗"} ${label}: got ${R(got)} want ~${R(want)}`);
  ok ? pass++ : fail++;
};

// Fixtures: one strategy worth V at the given sleeve, accrued daily across a month.
function fixture({ positionsCents, bufferCents, residualCents = 0, priorReceivable = 0, consumed = 0 }) {
  return {
    app_settings: [{ key: "fees", value: { aumFeeRate: 0.0099 } }],
    stock_holdings_c: [{ user_id: "u1", family_member_id: null, strategy_id: "s1", security_id: "sec1", quantity: 1, transaction_id: "t1", is_active: true }],
    stock_intraday_c: [{ security_id: "sec1", current_price: positionsCents, timestamp: "2026-06-30T00:00:00Z" }],
    stock_returns_c: [],
    transactions: [{ id: "t1", buffer_cents: bufferCents, buffer_consumed_cents: 0 }],
    strategy_rebalance_residuals: residualCents ? [{ user_id: "u1", family_member_id: null, strategy_id: "s1", balance_cents: residualCents }] : [],
    strategy_aum_fee_state: (priorReceivable || consumed) ? [{ id: "st1", user_id: "u1", family_member_id: null, strategy_id: "s1", aum_fee_consumed_cents: consumed, aum_fee_receivable_cents: priorReceivable, low_cash_flag: false }] : [],
    aum_fee_accrual_segments: [],
    aum_fee_transactions: [],
    mint_revenue_daily: [],
    strategies: [{ id: "s1", name: "MINT Growth" }],
    notifications: [],
  };
}

async function accrueMonth(db, year, monthIdx0, days) {
  for (let d = 1; d <= days; d++) {
    await runDailyAccrual(db, new Date(Date.UTC(year, monthIdx0, d, 21, 30)));
  }
}

(async () => {
  // ── Case 1: simple month. V=R15,000 (positions 13,800 + buffer 1,200), June=30d.
  // Spec: ~R12.19. (0.99%/365 × 30 × 15,000.)
  {
    const tables = fixture({ positionsCents: 1380000, bufferCents: 120000 });
    const db = makeDb(tables);
    await accrueMonth(db, 2026, 5, 30);
    const r = await runMonthlySettlement(db, new Date(Date.UTC(2026, 5, 30, 21, 30)));
    const txn = tables.aum_fee_transactions[0];
    console.log("\n[Case 1: simple month]");
    assertNear("June fee deducted", txn.deducted_from_cash_cents, 1220, 3);
    assertNear("AUM revenue rolled up", tables.mint_revenue_daily[0].aum_fees_collected_cents, 1220, 3);
    const st = tables.strategy_aum_fee_state[0];
    assertNear("sleeve consumed", st.aum_fee_consumed_cents, 1220, 3);
    console.log(`  receivable=${R(st.aum_fee_receivable_cents)} lowCash=${st.low_cash_flag} notif="${tables.notifications[0] && tables.notifications[0].body}"`);
  }

  // ── Case 2: top-up proration. Start V=R10,000 for 9 days, then R15,000 for 21.
  // Spec: ~R10.97. We simulate by raising the price mid-month.
  {
    const tables = fixture({ positionsCents: 920000, bufferCents: 80000 }); // V=10,000
    const db = makeDb(tables);
    await accrueMonth(db, 2026, 5, 9); // days 1–9 at 10,000
    tables.stock_intraday_c[0].current_price = 1420000; // bump positions → V=15,000
    for (let d = 10; d <= 30; d++) await runDailyAccrual(db, new Date(Date.UTC(2026, 5, d, 21, 30)));
    const r = await runMonthlySettlement(db, new Date(Date.UTC(2026, 5, 30, 21, 30)));
    const txn = tables.aum_fee_transactions[0];
    console.log("\n[Case 2: top-up day 10]");
    assertNear("June fee (proration)", txn.deducted_from_cash_cents, 1097, 5);
  }

  // ── Case 3: low cash. Fee due > sleeve. Sleeve only R5; fee ~R12.
  {
    const tables = fixture({ positionsCents: 1499500, bufferCents: 500 }); // V≈15,000, sleeve R5
    const db = makeDb(tables);
    await accrueMonth(db, 2026, 5, 30);
    await runMonthlySettlement(db, new Date(Date.UTC(2026, 5, 30, 21, 30)));
    const txn = tables.aum_fee_transactions[0];
    const st = tables.strategy_aum_fee_state[0];
    console.log("\n[Case 3: low-cash protocol]");
    assertNear("deducted = whatever was available", txn.deducted_from_cash_cents, 500, 1);
    assertNear("receivable = remainder", st.aum_fee_receivable_cents, 720, 5);
    console.log(`  low_cash_flag=${st.low_cash_flag} (expect true)`);
    if (st.low_cash_flag === true) pass++; else { fail++; console.log("  ✗ low_cash_flag not set"); }
  }

  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
