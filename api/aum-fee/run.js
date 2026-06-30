// Vercel cron — AUM management fee daily accrual (+ gated month-end settlement).
//
// Why this exists: the engine (server/aumFeeEngine.cjs) was only wired as a
// node-cron inside the Express server, which isn't guaranteed to run as a
// persistent process — so in practice AUM never accrued for invested users.
// This serverless endpoint, driven by a Vercel cron (vercel.json), runs it
// reliably regardless of the Express host, exactly like gift/expire & eod-save.
//
// Safety model:
//  • ACCRUAL runs every invocation. It moves no money — just records what each
//    position owes for the period, idempotently (accrues by elapsed days, so a
//    double-run = 0 extra days and a missed day catches up).
//  • SETTLEMENT (which deducts the fee from the 8% cash sleeve) only runs when
//    AUM_SETTLE_ENABLED === "true" AND the engine's own month-end check passes.
//    So you can let accrual build for a few days, verify the numbers, then flip
//    the env var before a month-end to let it actually charge.
//
// Manual/UAT use: POST (or GET) with ?user_id=&strategy_id= to scope a run to
// one account; ?settle=force to force a settlement for that scope (still only
// when AUM_SETTLE_ENABLED is true) so you can dry-run one account end-to-end.
import { supabaseAdmin, supabase } from "../_lib/supabase.js";
import aumFeeEngine from "../../server/aumFeeEngine.cjs";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database client not configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const userId = body.user_id || req.query?.user_id || null;
  const strategyId = body.strategy_id || req.query?.strategy_id || null;
  const scope = { userId, strategyId };

  // Settlement moves money — keep it off until explicitly enabled in Vercel.
  const settleEnabled = process.env.AUM_SETTLE_ENABLED === "true";
  const forceSettle = (body.settle || req.query?.settle) === "force";

  try {
    const out = { ranAt: new Date().toISOString(), scope, settleEnabled };

    // 1) Accrual — always safe.
    out.accrual = await aumFeeEngine.runDailyAccrual(db, new Date(), scope);

    // 2) Settlement — gated. Without force it self-skips unless it's month-end.
    if (settleEnabled) {
      out.settlement = await aumFeeEngine.runMonthlySettlement(db, new Date(), {
        force: forceSettle,
        userId,
        strategyId,
      });
    } else {
      out.settlement = { skipped: "AUM_SETTLE_ENABLED not set — accrual only" };
    }

    return res.json({ ok: true, ...out });
  } catch (e) {
    console.error("[aum-fee/run] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
