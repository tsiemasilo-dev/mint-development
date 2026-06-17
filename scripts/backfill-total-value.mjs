// Backfill client_strategy_returns_c.total_value_cents for existing rows.
// total_value = positions(basket_value) + cash, where cash = 8% buffer remaining
// (from the scope's funding txns) + rebalance residual (present only from the
// rebalance date forward, so pre-rebalance anchors aren't inflated).
// Run AFTER the migration adds the column.  DRY_RUN=1 previews without writing.
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_ = env.SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const DRY_RUN = process.env.DRY_RUN !== "0"; // default dry-run; pass DRY_RUN=0 to write
const Q = async (p) => { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p} -> ${r.status} ${await r.text()}`); return r.json(); };
const PATCH = async (p, body) => { const r = await fetch(`${URL_}/rest/v1/${p}`, { method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`PATCH ${p} -> ${r.status} ${await r.text()}`); };

// 1) all returns rows
const rows = await Q(`client_strategy_returns_c?select=id,user_id,family_member,strategy_id,as_of_date,basket_value,total_value_cents&order=as_of_date.asc&limit=20000`);
const groups = {};
rows.forEach(r => { const k = `${r.user_id}|${r.family_member || ""}|${r.strategy_id}`; (groups[k] = groups[k] || []).push(r); });
console.log(`${rows.length} rows across ${Object.keys(groups).length} scopes. DRY_RUN=${DRY_RUN}`);

let patched = 0, scopes = 0;
for (const [key, grp] of Object.entries(groups)) {
  const [userId, fam, strategyId] = key.split("|");
  const isFam = !!fam;
  const holdScope = isFam ? `family_member_id=eq.${fam}` : `user_id=eq.${userId}&family_member_id=is.null`;
  // buffer: active holdings' funding txns
  const hold = await Q(`stock_holdings_c?select=transaction_id&strategy_id=eq.${strategyId}&is_active=eq.true&${holdScope}`);
  const txIds = [...new Set(hold.map(h => h.transaction_id).filter(Boolean))];
  let buffer = 0;
  if (txIds.length) { const txns = await Q(`transactions?select=buffer_cents,buffer_consumed_cents&id=in.(${txIds.join(",")})`); txns.forEach(t => buffer += Number(t.buffer_cents || 0) - Number(t.buffer_consumed_cents || 0)); }
  // residual
  const resScope = isFam ? `family_member_id=eq.${fam}` : `user_id=eq.${userId}&family_member_id=is.null`;
  let residual = 0; (await Q(`strategy_rebalance_residuals?select=balance_cents&strategy_id=eq.${strategyId}&${resScope}`)).forEach(r => residual += Number(r.balance_cents || 0));
  // earliest rebalance sell date for this scope (when residual appeared)
  const reb = await Q(`stock_holdings_c?select=closed_at&strategy_id=eq.${strategyId}&closed_reason=eq.REBALANCE_SELL&${holdScope}&order=closed_at.asc&limit=1`);
  const rebDate = (reb[0]?.closed_at || "").slice(0, 10);

  for (const row of grp) {
    const total = Number(row.basket_value || 0) + buffer + (rebDate && row.as_of_date >= rebDate ? residual : 0);
    if (Number(row.total_value_cents) === total) continue; // already correct
    if (DRY_RUN) { if (patched < 12) console.log(`  [dry] ${row.as_of_date} ${key.slice(0,18)} basket ${row.basket_value} +buf ${buffer} +res ${rebDate && row.as_of_date>=rebDate?residual:0} -> total ${total}`); }
    else await PATCH(`client_strategy_returns_c?id=eq.${row.id}`, { total_value_cents: total });
    patched++;
  }
  scopes++;
}
console.log(`${DRY_RUN ? "would patch" : "patched"} ${patched} rows across ${scopes} scopes.`);
