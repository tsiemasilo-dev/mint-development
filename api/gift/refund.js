import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

// POST /api/gift/refund  { gift_id }
//
// Manual refund of an EXPIRED, unclaimed gift back to the sender's wallet (reserve
// model: funds were debited at SEND via reserved_at, held through expiry — expire.js
// does NOT auto-refund — and returned only when the sender taps "Refund to wallet").
//
// Idempotent: refunded_at is set atomically as the lock, so a double-tap or a race
// can never refund twice. Only the sender, only reserved + expired + not-yet-refunded
// gifts qualify.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { gift_id } = req.body || {};
  if (!gift_id) return res.status(400).json({ error: "gift_id is required." });

  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, status, asset_name, expires_at, reserved_at, refunded_at")
    .eq("id", gift_id)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can refund this gift." });
  if (gift.status === "claimed") return res.status(400).json({ error: "This gift was claimed and can't be refunded." });
  if (gift.refunded_at) return res.status(400).json({ error: "This gift was already refunded." });
  if (!gift.reserved_at) return res.status(400).json({ error: "Nothing to refund for this gift." });

  const nowIso = new Date().toISOString();
  const expired = gift.status === "expired" || new Date(gift.expires_at) < new Date();
  if (!expired) return res.status(400).json({ error: "This gift hasn't expired yet." });

  // Atomic lock: only the call that flips refunded_at from null wins and refunds.
  // Also enforces (in the DB) reserved + expired + not-claimed, so a still-active
  // gift can never be drained by a racing request.
  const { data: locked, error: lockErr } = await db
    .from("gift_claims")
    .update({ status: "expired", refunded_at: nowIso })
    .eq("id", gift.id)
    .is("refunded_at", null)
    .not("reserved_at", "is", null)
    .lt("expires_at", nowIso)
    .neq("status", "claimed")
    .select("id")
    .maybeSingle();
  if (lockErr) {
    console.error("[gift/refund] lock error:", lockErr.message);
    return res.status(500).json({ error: "Failed to refund gift." });
  }
  if (!locked) return res.status(400).json({ error: "This gift can no longer be refunded." });

  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  const currentBalance = Number(wallet?.balance || 0);
  const refundRands = gift.amount / 100;

  const { error: walletErr } = await db
    .from("wallets")
    .update({ balance: currentBalance + refundRands })
    .eq("user_id", user.id);
  if (walletErr) {
    console.error("[gift/refund] wallet error:", walletErr.message);
    return res.status(500).json({ error: "Refund failed — please contact support." });
  }

  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "credit",
      name: `Gift Refunded — ${gift.asset_name}`,
      description: "Unclaimed gift refunded to wallet",
      amount: gift.amount,
      store_reference: `GIFT2-REFUND-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: nowIso,
      created_at: nowIso,
    });
  } catch (e) { console.warn("[gift/refund] tx:", e.message); }

  return res.json({ success: true, refunded_amount: gift.amount });
}
