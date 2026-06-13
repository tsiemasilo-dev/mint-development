import { supabaseAdmin, supabase as supabaseAnon } from "./_lib/supabase.js";
import { getFeeConfig } from "./_lib/fees.js";

// Public fee schedule for the client UIs. Returns the current platform fee
// values so the app can DISPLAY the same numbers the server charges, instead of
// hardcoding them in ~10 places. Fee rates aren't sensitive, so no auth needed.
// Falls back to defaults (inside getFeeConfig) if the config table is absent.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Let clients/CDN cache briefly; matches the server-side 60s config cache.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ success: false });

  try {
    const db = supabaseAdmin || supabaseAnon;
    const c = await getFeeConfig(db);
    return res.json({
      success: true,
      fees: {
        // canonical UPPER_CASE names (mirror api/_lib/fees.js)
        ISIN_FEE_PER_ASSET:     c.ISIN_FEE_PER_ASSET,
        BROKER_FEE_RATE:        c.BROKER_FEE_RATE,
        TRANSACTION_FEE_RATE:   c.TRANSACTION_FEE_RATE,
        EXECUTION_RESERVE_RATE: c.EXECUTION_RESERVE_RATE,
        MONTHLY_STRATEGY_FEE:   c.MONTHLY_STRATEGY_FEE,
        // alias the client code already uses for the 8% reserve
        CASH_BUFFER_RATE:       c.EXECUTION_RESERVE_RATE,
      },
    });
  } catch (err) {
    console.error("[fees-config]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
