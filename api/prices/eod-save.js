// Vercel cron job — runs at 17:05 SAST (15:05 UTC) Mon–Fri after JSE close.
// Reads each security's latest intraday price and upserts into stock_returns_c
// so the W/M/3M/6M/YTD/1Y chart fallback layer always has fresh daily data.
import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  // Only allow cron invocations (Vercel sets this header) or a manual GET
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database client not initialised" });

  const now = new Date();
  const dow = now.getUTCDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) {
    return res.json({ skipped: true, reason: "Weekend — JSE closed" });
  }

  const todayStr = now.toISOString().split("T")[0];
  console.log(`[eod-save] Running for ${todayStr}...`);

  try {
    const { data: securities, error: secErr } = await db
      .from("securities_c")
      .select("id, symbol");

    if (secErr || !securities?.length) {
      console.error("[eod-save] Could not fetch securities:", secErr?.message);
      return res.status(500).json({ error: secErr?.message || "No securities found" });
    }

    let saved = 0, skipped = 0, failed = 0;

    // Process in batches of 10 to avoid overwhelming Supabase
    for (let i = 0; i < securities.length; i += 10) {
      const batch = securities.slice(i, i + 10);
      await Promise.all(batch.map(async (sec) => {
        try {
          const { data: latest } = await db
            .from("stock_intraday_c")
            .select("current_price, timestamp")
            .eq("security_id", sec.id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latest?.current_price) { skipped++; return; }

          const { error: upsertErr } = await db.from("stock_returns_c").upsert(
            { security_id: sec.id, as_of_date: todayStr, current_price: latest.current_price },
            { onConflict: "security_id,as_of_date", ignoreDuplicates: false }
          );

          if (upsertErr) {
            console.error(`[eod-save] ${sec.symbol}:`, upsertErr.message);
            failed++;
          } else {
            saved++;
          }
        } catch (e) {
          console.error(`[eod-save] ${sec.symbol}:`, e.message);
          failed++;
        }
      }));
    }

    console.log(`[eod-save] Done — saved: ${saved}, skipped: ${skipped}, failed: ${failed} / ${securities.length}`);
    return res.json({ date: todayStr, saved, skipped, failed, total: securities.length });
  } catch (err) {
    console.error("[eod-save] Unexpected error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
