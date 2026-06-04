import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

const EXPIRY_HOURS = 4;

async function generateUniqueCode(db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: existing } = await db
      .from("gift_claims")
      .select("id")
      .eq("token", code)
      .eq("status", "pending_claim")
      .maybeSingle();
    if (!existing) return code;
  }
  throw new Error("Could not generate unique gift code");
}

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

  const {
    asset_type, strategy_id, security_id, security_symbol, asset_name,
    amount, recipient_first_name, recipient_last_name, message,
  } = req.body || {};

  if (!asset_name) return res.status(400).json({ error: "asset_name is required." });
  if (!amount || typeof amount !== "number" || amount <= 0) return res.status(400).json({ error: "amount must be a positive number in cents." });
  if (!["strategy", "stock"].includes(asset_type)) return res.status(400).json({ error: "asset_type must be 'strategy' or 'stock'." });
  if (!recipient_first_name?.trim()) return res.status(400).json({ error: "recipient_first_name is required." });
  if (!recipient_last_name?.trim()) return res.status(400).json({ error: "recipient_last_name is required." });

  // Wallet deduction — optimistic lock
  const { data: wallet, error: walletQueryErr } = await db
    .from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  if (walletQueryErr || !wallet) return res.status(400).json({ error: "Wallet not found." });

  const originalBalance = Number(wallet.balance);
  const amountRands = amount / 100;
  if (originalBalance < amountRands) return res.status(400).json({ error: "Insufficient wallet balance." });

  const { error: deductErr } = await db
    .from("wallets")
    .update({ balance: originalBalance - amountRands })
    .eq("user_id", user.id)
    .eq("balance", originalBalance);
  if (deductErr) return res.status(500).json({ error: "Failed to deduct wallet balance." });

  // Encode recipient name + message into the message column as JSON
  const messagePayload = JSON.stringify({
    fn: recipient_first_name.trim(),
    ln: recipient_last_name.trim(),
    ...(message?.trim() ? { msg: message.trim() } : {}),
  });

  const code = await generateUniqueCode(db).catch(async (e) => {
    await db.from("wallets").update({ balance: originalBalance }).eq("user_id", user.id);
    return null;
  });
  if (!code) return res.status(500).json({ error: "Failed to generate gift code. Please try again." });

  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: gift, error: insertErr } = await db
    .from("gift_claims")
    .insert({
      sender_user_id: user.id,
      recipient_identifier: null,
      recipient_user_id: null,
      amount,
      asset_type,
      strategy_id: strategy_id || null,
      security_id: security_id || null,
      security_symbol: security_symbol || null,
      asset_name,
      token: code,
      status: "pending_claim",
      message: messagePayload,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();

  if (insertErr) {
    await db.from("wallets").update({ balance: originalBalance }).eq("user_id", user.id);
    console.error("[gift/create-v2] insert error:", insertErr.message);
    return res.status(500).json({ error: "Failed to create gift." });
  }

  const now = new Date().toISOString();
  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "debit",
      name: `Investment Gift — ${asset_name}`,
      description: `Gift to ${recipient_first_name.trim()} ${recipient_last_name.trim()}`,
      amount,
      store_reference: `GIFT2-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: now,
      created_at: now,
    });
  } catch (e) { console.warn("[gift/create-v2] tx insert:", e.message); }

  return res.json({ success: true, token: gift.token, expires_at: gift.expires_at, gift_id: gift.id });
}
