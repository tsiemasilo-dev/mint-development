import { supabase, supabaseAdmin } from "../_lib/supabase.js";

// Cron endpoint — called every 15 minutes by Vercel (GET) or internally (POST).
// Expires unclaimed gifts past expires_at and REFUNDS the sender's wallet for any
// gift whose funds were reserved at send (reserve model — gift_claims.reserved_at).
// Legacy gifts (no reserved_at) were never debited at send, so they expire WITHOUT
// a refund. Double-refunds are prevented by flipping pending_claim -> expired per
// gift as an atomic lock: only the run that wins the flip performs the refund.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const nowIso = new Date().toISOString();

  const { data: expiring, error: selErr } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, asset_name, reserved_at")
    .eq("status", "pending_claim")
    .lt("expires_at", nowIso);

  if (selErr) {
    console.error("[gift/expire] select error:", selErr.message);
    return res.status(500).json({ error: "Failed to load expiring gifts." });
  }

  let expiredCount = 0;
  let refundedCount = 0;

  for (const gift of (expiring || [])) {
    // Atomic claim: only the invocation that flips pending_claim -> expired
    // proceeds. This is the lock that prevents double-refunds across overlapping
    // cron runs (and races with cancel). If 0 rows come back, someone else already
    // expired/cancelled it — skip.
    const { data: flipped, error: flipErr } = await db
      .from("gift_claims")
      .update({ status: "expired" })
      .eq("id", gift.id)
      .eq("status", "pending_claim")
      .select("id")
      .maybeSingle();
    if (flipErr) { console.error(`[gift/expire] flip ${gift.id}:`, flipErr.message); continue; }
    if (!flipped) continue;
    expiredCount++;

    // Refund ONLY gifts whose funds were actually reserved at send. Legacy gifts
    // were never debited, so there is nothing to return.
    if (!gift.reserved_at) continue;

    try {
      const { data: w } = await db.from("wallets").select("balance").eq("user_id", gift.sender_user_id).maybeSingle();
      if (w) {
        const refundRands = Number(gift.amount) / 100;
        await db.from("wallets").update({ balance: Number(w.balance) + refundRands }).eq("user_id", gift.sender_user_id);
        await db.from("transactions").insert({
          user_id: gift.sender_user_id,
          direction: "credit",
          name: `Gift Expired — ${gift.asset_name}`,
          description: "Unclaimed gift refunded to wallet",
          amount: gift.amount,
          store_reference: `GIFT2-EXPIRE-${gift.id}`,
          currency: "ZAR",
          status: "posted",
          transaction_date: nowIso,
          created_at: nowIso,
        });
        refundedCount++;
      }
    } catch (e) { console.warn(`[gift/expire] refund ${gift.id}:`, e.message); }
  }

  console.log(`[gift/expire] expired ${expiredCount}, refunded ${refundedCount}`);
  return res.json({ success: true, expired_count: expiredCount, refunded_count: refundedCount });
}
