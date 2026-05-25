import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

async function allocateStrategyHoldings(db, userId, strategyId, strategyHoldings, amountCents, storeReference) {
  const investAmountRands = amountCents / 100;
  if (!strategyHoldings.length) return 0;

  const symbols = strategyHoldings.map(h => h.symbol).filter(Boolean);
  const { data: securities } = await db
    .from("securities_c").select("id, symbol, last_price").in("symbol", symbols);
  const secMap = {};
  (securities || []).forEach(s => { secMap[s.symbol] = s; });

  let totalBasketCost = 0;
  for (const h of strategyHoldings) {
    if (secMap[h.symbol]?.last_price) totalBasketCost += secMap[h.symbol].last_price * (h.weight || 1);
  }

  let created = 0;
  if (totalBasketCost > 0) {
    const scale = investAmountRands / totalBasketCost;
    for (const h of strategyHoldings) {
      const sec = secMap[h.symbol];
      if (!sec?.last_price) continue;
      const qty = Math.max(1, Math.round((h.weight || 1) * scale));
      try {
        // Always insert a NEW row per gift-claimed strategy — keeps each
        // purchase event distinguishable for the stacked-card UI.
        await db.from("stock_holdings_c").insert({
          user_id: userId, security_id: sec.id, quantity: qty,
          avg_fill: null, market_value: 0,
          unrealized_pnl: 0, as_of_date: null,
          strategy_id: strategyId, Status: "active",
          store_reference: storeReference || null,
        });
        created++;
      } catch (e) { console.warn(`[gift/claim-v2] holding upsert ${h.symbol}:`, e.message); }
    }
  }
  return created;
}

async function allocateStockHolding(db, userId, securityId, amountCents, storeReference) {
  const { data: sec } = await db
    .from("securities_c").select("id, symbol, last_price").eq("id", securityId).maybeSingle();
  if (!sec?.last_price) return { qty: 0, holdingId: null };

  const qty = Math.max(1, Math.floor((amountCents / 100) / sec.last_price));

  try {
    // Always insert a NEW row per gift-claimed stock so each claim is a
    // discrete pending position with its own broker-fill lifecycle. Matches
    // the strategy-claim pattern; the stacked-card UI groups by created_at.
    const { data: inserted } = await db.from("stock_holdings_c").insert({
      user_id: userId, security_id: sec.id, quantity: qty,
      avg_fill: null, market_value: 0,
      unrealized_pnl: 0, as_of_date: null,
      Status: "active",
      store_reference: storeReference || null,
    }).select("id").single();
    return { qty, holdingId: inserted?.id || null };
  } catch (e) {
    console.warn("[gift/claim-v2] stock holding insert:", e.message);
    return { qty: 0, holdingId: null };
  }
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

  const { code, id_number } = req.body || {};
  if (!code) return res.status(400).json({ error: "code is required." });
  if (!id_number?.trim()) return res.status(400).json({ error: "id_number is required." });

  const cleanCode = String(code).replace(/\D/g, "");
  const cleanId = String(id_number).replace(/\D/g, "");

  // Verify the authenticated user's profile matches the supplied ID
  const { data: claimantProfile } = await db
    .from("profiles").select("id, id_number, first_name, last_name, mint_number")
    .eq("id", user.id).maybeSingle();

  if (!claimantProfile) return res.status(400).json({ error: "Profile not found." });
  if (claimantProfile.id_number !== cleanId) {
    return res.status(403).json({ error: "SA ID number does not match your account." });
  }
  if (!claimantProfile.mint_number) {
    return res.status(403).json({ error: "Please complete your Mint account setup before claiming.", mint_number_required: true });
  }

  // KYC check
  const { data: onboarding } = await db
    .from("user_onboarding").select("kyc_status").eq("user_id", user.id).maybeSingle();
  const kycStatus = onboarding?.kyc_status;
  if (kycStatus !== "verified" && kycStatus !== "onboarding_complete") {
    return res.status(403).json({ error: "FICA verification required to claim this gift.", kyc_required: true });
  }

  // Fetch gift
  const { data: gift } = await db
    .from("gift_claims").select("*").eq("token", cleanCode).eq("status", "pending_claim").maybeSingle();

  if (!gift) return res.status(404).json({ error: "Gift not found or already claimed." });
  if (new Date(gift.expires_at) < new Date()) return res.status(400).json({ error: "This gift has expired." });
  if (gift.sender_user_id === user.id) return res.status(400).json({ error: "You cannot claim your own gift." });

  // Allocate holdings
  let holdingsCreated = 0;
  let holdingId = null;

  const giftStoreRef = `GIFT2-CLAIM-${gift.id}`;

  if (gift.asset_type === "strategy" && gift.strategy_id) {
    const { data: strategy } = await db
      .from("strategies_c").select("id, holdings").eq("id", gift.strategy_id).maybeSingle();
    holdingsCreated = await allocateStrategyHoldings(
      db, user.id, gift.strategy_id, strategy?.holdings || [], gift.amount, giftStoreRef
    );
  } else if (gift.asset_type === "stock" && gift.security_id) {
    const result = await allocateStockHolding(db, user.id, gift.security_id, gift.amount, giftStoreRef);
    holdingsCreated = result.qty > 0 ? 1 : 0;
    holdingId = result.holdingId;
  }

  if (holdingsCreated === 0) {
    return res.status(500).json({ error: "Failed to allocate holdings. Please try again." });
  }

  const now = new Date().toISOString();

  // Record credit transaction for recipient
  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "credit",
      name: `Gift Received — ${gift.asset_name}`,
      description: "Investment gift claimed",
      amount: gift.amount,
      store_reference: `GIFT2-CLAIM-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: now,
      created_at: now,
    });
  } catch (e) { console.warn("[gift/claim-v2] tx insert:", e.message); }

  // Mark gift claimed — store the ID number so it can be verified
  await db.from("gift_claims").update({
    status: "claimed",
    recipient_user_id: user.id,
    recipient_identifier: cleanId,
    claimed_at: now,
  }).eq("id", gift.id);

  // Notify sender
  const recipientName = [claimantProfile.first_name, claimantProfile.last_name].filter(Boolean).join(" ") || "Your recipient";
  try {
    await db.from("notifications").insert({
      user_id: gift.sender_user_id,
      title: "Gift claimed!",
      body: `${recipientName} claimed your gift of ${gift.asset_name}.`,
      type: "investment",
      payload: { action: "gift_claimed", gift_id: gift.id, asset_name: gift.asset_name },
    });
  } catch (e) { console.warn("[gift/claim-v2] sender notification:", e.message); }

  return res.json({
    success: true,
    holding_id: holdingId,
    asset_name: gift.asset_name,
    portfolio_redirect: true,
  });
}
