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
    .select("id, sender_user_id, amount, status, asset_name")
    .eq("id", gift_id)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can cancel a gift." });
  if (gift.status === "claimed") return res.status(400).json({ error: "Cannot cancel a gift that has already been claimed." });
  if (gift.status === "cancelled") return res.status(400).json({ error: "Gift is already cancelled." });
  if (gift.status === "expired") return res.status(400).json({ error: "Gift has already expired and been refunded." });

  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  const currentBalance = Number(wallet?.balance || 0);
  const refundRands = gift.amount / 100;

  const { error: walletErr } = await db
    .from("wallets")
    .update({ balance: currentBalance + refundRands })
    .eq("user_id", user.id);

  if (walletErr) return res.status(500).json({ error: "Failed to refund wallet." });

  await db
    .from("gift_claims")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", gift.id);

  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "credit",
      name: `Gift Cancelled — ${gift.asset_name}`,
      description: "Gift refunded to wallet",
      amount: gift.amount,
      store_reference: `GIFT-CANCEL-${gift.id}`,
      status: "posted",
    });
  } catch (e) { console.warn("[gift/cancel] tx:", e.message); }

  return res.json({ success: true, refunded_amount: gift.amount });
}
