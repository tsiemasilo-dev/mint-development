import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

const EXPIRY_HOURS = 4;

// POST /api/gift/retry  { gift_id }
//
// "Try again" on an expired gift: re-send to the SAME recipient by REACTIVATING
// the same gift_claims row (new code + fresh 4h expiry) instead of creating a new
// gift — so a single recipient never stacks multiple history cards.
//
// Funds: reserve model. If the gift's funds are still held (reserved_at set,
// refunded_at null) we reuse them — no new debit. If they were refunded (or never
// reserved), we debit the wallet again. Optimistic-locked on the OLD token so a
// double-tap can't double-debit.
async function generateUniqueCode(db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: existing } = await db
      .from("gift_claims").select("id").eq("token", code).eq("status", "pending_claim").maybeSingle();
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

  const { gift_id } = req.body || {};
  if (!gift_id) return res.status(400).json({ error: "gift_id is required." });

  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, asset_name, status, token, expires_at, reserved_at, refunded_at")
    .eq("id", gift_id)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can resend this gift." });
  if (gift.status === "claimed") return res.status(400).json({ error: "This gift was already claimed." });
  // Only resend an EXPIRED gift (cron-marked, or pending but past its time).
  const expired = gift.status === "expired" || gift.status === "cancelled" ||
    (gift.status === "pending_claim" && new Date(gift.expires_at) < new Date());
  if (!expired) return res.status(400).json({ error: "This gift is still active." });

  // Funds not currently held → must debit again. (reserved_at null = legacy/never
  // held; refunded_at set = money was returned to the wallet.)
  const needsDebit = !gift.reserved_at || !!gift.refunded_at;
  const amountRands = gift.amount / 100;

  // Take the funds FIRST (so a claimable gift never exists without money behind it);
  // rolled back below if we lose the reactivation race.
  let debited = false;
  let originalBalance = 0;
  if (needsDebit) {
    const { data: w } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    if (!w) return res.status(400).json({ error: "Wallet not found." });
    originalBalance = Number(w.balance);
    if (originalBalance < amountRands) return res.status(400).json({ error: "Insufficient wallet balance." });
    const { error: debitErr } = await db.from("wallets").update({ balance: originalBalance - amountRands }).eq("user_id", user.id);
    if (debitErr) {
      console.error("[gift/retry] debit error:", debitErr.message);
      return res.status(500).json({ error: "Failed to reserve gift funds." });
    }
    debited = true;
  }

  let newCode;
  try { newCode = await generateUniqueCode(db); }
  catch (e) {
    if (debited) await db.from("wallets").update({ balance: originalBalance }).eq("user_id", user.id);
    return res.status(500).json({ error: "Failed to generate gift code. Please try again." });
  }

  const now = new Date().toISOString();
  const newExpires = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  // Optimistic lock on the OLD token: only the call that still sees gift.token wins.
  // A concurrent retry that already rotated the token matches 0 rows → it backs out.
  const { data: reactivated, error: upErr } = await db
    .from("gift_claims")
    .update({
      status: "pending_claim",
      token: newCode,
      expires_at: newExpires,
      reserved_at: now,
      refunded_at: null,
      claimed_at: null,
      cancelled_at: null,
    })
    .eq("id", gift.id)
    .eq("token", gift.token)
    .neq("status", "claimed")
    .select("id, token, expires_at")
    .maybeSingle();

  if (upErr || !reactivated) {
    if (debited) await db.from("wallets").update({ balance: originalBalance }).eq("user_id", user.id);
    return res.status(400).json({ error: "This gift can no longer be resent." });
  }

  // Record the re-reservation debit in the sender's history (only when we debited).
  if (debited) {
    try {
      await db.from("transactions").insert({
        user_id: user.id,
        direction: "debit",
        name: `Investment Gift — ${gift.asset_name}`,
        description: "Gift resent — reserved until claimed",
        amount: gift.amount,
        store_reference: `GIFT2-RESEND-${gift.id}-${Date.now()}`,
        currency: "ZAR",
        status: "posted",
        transaction_date: now,
        created_at: now,
      });
    } catch (e) { console.warn("[gift/retry] tx insert:", e.message); }
  }

  return res.json({ success: true, token: reactivated.token, expires_at: reactivated.expires_at, redebited: debited });
}
