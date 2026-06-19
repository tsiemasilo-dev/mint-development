import { supabase, supabaseAdmin } from "../_lib/supabase.js";

// Cron endpoint — called every 15 minutes by Vercel (GET) or internally (POST).
// Marks all unclaimed gifts past expires_at as "expired". No auto-refund: per CEO,
// there is no time extension, and the sender's reserved funds are returned only
// when they tap "Refund to wallet" (api/gift/refund.js). The bulk flip touches
// only pending_claim -> expired, so it's safe to re-run.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { error, count } = await db
    .from("gift_claims")
    .update({ status: "expired" })
    .eq("status", "pending_claim")
    .lt("expires_at", new Date().toISOString());

  if (error) {
    console.error("[gift/expire] update error:", error.message);
    return res.status(500).json({ error: "Failed to expire gifts." });
  }

  console.log(`[gift/expire] marked ${count ?? "unknown"} gifts as expired`);
  return res.json({ success: true, expired_count: count ?? null });
}
