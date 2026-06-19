import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

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
    .select("id, sender_user_id, amount, status, asset_name, reserved_at")
    .eq("id", gift_id)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can cancel a gift." });
  if (gift.status === "claimed") return res.status(400).json({ error: "Cannot cancel a gift that has already been claimed." });
  if (gift.status === "cancelled") return res.status(400).json({ error: "Gift is already cancelled." });
  if (gift.status === "expired") return res.status(400).json({ error: "Gift has already expired." });

  // Atomic flip pending_claim -> cancelled. This is the lock: only the call that
  // wins the flip refunds, so a double-tap or a race with the expire cron can't
  // refund twice.
  const nowIso = new Date().toISOString();
  const { data: flipped, error: flipErr } = await db
    .from("gift_claims")
    .update({ status: "cancelled", cancelled_at: nowIso })
    .eq("id", gift.id)
    .eq("status", "pending_claim")
    .select("id")
    .maybeSingle();
  if (flipErr) return res.status(500).json({ error: "Failed to cancel gift." });
  if (!flipped) return res.status(400).json({ error: "Gift can no longer be cancelled." });

  // Refund ONLY if the funds were actually reserved at send (reserve model).
  // Legacy gifts (no reserved_at) were never debited, so refunding them would hand
  // out free money — they're just marked cancelled.
  if (!gift.reserved_at) {
    return res.json({ success: true, refunded_amount: 0 });
  }

  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  const currentBalance = Number(wallet?.balance || 0);
  const refundRands = gift.amount / 100;

  const { error: walletErr } = await db
    .from("wallets")
    .update({ balance: currentBalance + refundRands })
    .eq("user_id", user.id);

  if (walletErr) {
    console.error("[gift/cancel] refund error:", walletErr.message);
    return res.status(500).json({ error: "Gift cancelled but the refund failed — please contact support." });
  }

  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "credit",
      name: `Gift Cancelled — ${gift.asset_name}`,
      description: "Gift refunded to wallet",
      amount: gift.amount,
      store_reference: `GIFT-CANCEL-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: nowIso,
      created_at: nowIso,
    });
  } catch (e) { console.warn("[gift/cancel] tx:", e.message); }

  return res.json({ success: true, refunded_amount: gift.amount });
}
