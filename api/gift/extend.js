import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

const EXTENSIONS = {
  "10h": { hours: 10, feePct: 0.05 },
  "24h": { hours: 24, feePct: 0.09 },
};

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

  const { gift_id, extension } = req.body || {};
  if (!gift_id) return res.status(400).json({ error: "gift_id is required." });
  if (!EXTENSIONS[extension]) return res.status(400).json({ error: "extension must be '10h' or '24h'." });

  const { data: gift } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, asset_name, status, expires_at")
    .eq("id", gift_id)
    .maybeSingle();

  if (!gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can extend a gift." });
  if (gift.status !== "pending_claim") return res.status(400).json({ error: "Only active pending gifts can be extended." });

  const { hours, feePct } = EXTENSIONS[extension];
  const feeCents = Math.round(gift.amount * feePct);
  const feeRands = feeCents / 100;

  // Deduct fee — optimistic lock
  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  if (!wallet) return res.status(400).json({ error: "Wallet not found." });

  const currentBalance = Number(wallet.balance);
  if (currentBalance < feeRands) return res.status(400).json({ error: "Insufficient wallet balance to pay extension fee." });

  const { error: feeErr } = await db
    .from("wallets")
    .update({ balance: currentBalance - feeRands })
    .eq("user_id", user.id)
    .eq("balance", currentBalance);
  if (feeErr) return res.status(500).json({ error: "Failed to deduct extension fee." });

  const currentExpiry = new Date(gift.expires_at);
  const baseTime = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiresAt = new Date(baseTime.getTime() + hours * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await db
    .from("gift_claims")
    .update({ expires_at: newExpiresAt })
    .eq("id", gift.id);

  if (updateErr) {
    await db.from("wallets").update({ balance: currentBalance }).eq("user_id", user.id);
    return res.status(500).json({ error: "Failed to extend gift." });
  }

  const now = new Date().toISOString();
  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "debit",
      name: `Gift Extension Fee — ${gift.asset_name}`,
      description: `Extended by ${hours}h (${feePct * 100}% fee)`,
      amount: feeCents,
      store_reference: `GIFT2-EXT-${gift.id}-${extension}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: now,
      created_at: now,
    });
  } catch (e) { console.warn("[gift/extend] tx insert:", e.message); }

  return res.json({ success: true, new_expires_at: newExpiresAt, fee_charged: feeCents });
}
