import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

async function allocateStrategyHoldings(db, userId, strategyId, strategyHoldings, amountCents) {
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
        const { data: existing } = await db.from("stock_holdings_c")
          .select("id, quantity")
          .eq("user_id", userId).eq("security_id", sec.id)
          .eq("strategy_id", strategyId).is("family_member_id", null).maybeSingle();
        if (existing) {
          await db.from("stock_holdings_c").update({
            quantity: Number(existing.quantity || 0) + qty,
            avg_fill: null,
            market_value: 0,
            unrealized_pnl: 0,
            as_of_date: null,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await db.from("stock_holdings_c").insert({
            user_id: userId, security_id: sec.id, quantity: qty,
            avg_fill: null, market_value: 0,
            unrealized_pnl: 0, as_of_date: null,
            strategy_id: strategyId, Status: "active",
          });
        }
        created++;
      } catch (e) { console.warn(`[gift/claim-to-self] holding upsert ${h.symbol}:`, e.message); }
    }
  }
  return created;
}

async function allocateStockHolding(db, userId, securityId, amountCents) {
  const { data: sec } = await db
    .from("securities_c").select("id, symbol, last_price").eq("id", securityId).maybeSingle();
  if (!sec?.last_price) return { qty: 0, holdingId: null };

  const qty = Math.max(1, Math.floor((amountCents / 100) / sec.last_price));

  try {
    const { data: existing } = await db.from("stock_holdings_c")
      .select("id, quantity")
      .eq("user_id", userId).eq("security_id", sec.id)
      .is("strategy_id", null).is("family_member_id", null).maybeSingle();

    if (existing) {
      await db.from("stock_holdings_c").update({
        quantity: Number(existing.quantity || 0) + qty,
        avg_fill: null,
        market_value: 0,
        unrealized_pnl: 0,
        as_of_date: null,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      return { qty, holdingId: existing.id };
    } else {
      const { data: inserted } = await db.from("stock_holdings_c").insert({
        user_id: userId, security_id: sec.id, quantity: qty,
        avg_fill: null, market_value: 0,
        unrealized_pnl: 0, as_of_date: null,
        Status: "active",
      }).select("id").single();
      return { qty, holdingId: inserted?.id || null };
    }
  } catch (e) {
    console.warn("[gift/claim-to-self] stock holding insert:", e.message);
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

  const { gift_id } = req.body || {};
  if (!gift_id) return res.status(400).json({ error: "gift_id is required." });

  // Fetch the gift
  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, asset_type, asset_name, strategy_id, security_id, status, expires_at")
    .eq("id", gift_id)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });
  if (gift.sender_user_id !== user.id) return res.status(403).json({ error: "Only the sender can claim this gift to their portfolio." });
  if (gift.status === "claimed") return res.status(400).json({ error: "Gift has already been claimed." });
  if (gift.status !== "expired" && gift.status !== "cancelled") {
    return res.status(400).json({ error: "Only expired or cancelled gifts can be added to your portfolio." });
  }

  // KYC/Onboarding check for sender
  const { data: onboarding } = await db
    .from("user_onboarding").select("kyc_status").eq("user_id", user.id).maybeSingle();
  const kycStatus = onboarding?.kyc_status;
  if (kycStatus !== "verified" && kycStatus !== "onboarding_complete") {
    return res.status(403).json({ error: "FICA verification required.", kyc_required: true });
  }

  const { data: profile } = await db
    .from("profiles").select("mint_number").eq("id", user.id).maybeSingle();
  if (!profile?.mint_number) {
    return res.status(403).json({ error: "Please complete your Mint account setup.", mint_number_required: true });
  }

  // Deduct amount from wallet (user is buying the gift for themselves)
  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  if (!wallet) return res.status(400).json({ error: "Wallet not found." });

  const currentBalance = Number(wallet.balance);
  const amountRands = gift.amount / 100;
  if (currentBalance < amountRands) return res.status(400).json({ error: "Insufficient wallet balance." });

  const { error: walletErr } = await db
    .from("wallets")
    .update({ balance: currentBalance - amountRands })
    .eq("user_id", user.id)
    .eq("balance", currentBalance);
  if (walletErr) return res.status(500).json({ error: "Failed to deduct from wallet." });

  // Allocate holdings
  let holdingsCreated = 0;
  let holdingId = null;

  if (gift.asset_type === "strategy" && gift.strategy_id) {
    const { data: strategy } = await db
      .from("strategies_c").select("id, holdings").eq("id", gift.strategy_id).maybeSingle();
    holdingsCreated = await allocateStrategyHoldings(
      db, user.id, gift.strategy_id, strategy?.holdings || [], gift.amount
    );
  } else if (gift.asset_type === "stock" && gift.security_id) {
    const result = await allocateStockHolding(db, user.id, gift.security_id, gift.amount);
    holdingsCreated = result.qty > 0 ? 1 : 0;
    holdingId = result.holdingId;
  }

  if (holdingsCreated === 0) {
    // Refund wallet if allocation failed
    await db.from("wallets").update({ balance: currentBalance }).eq("user_id", user.id);
    return res.status(500).json({ error: "Failed to allocate holdings. Please try again." });
  }

  const now = new Date().toISOString();

  // Record debit transaction for purchase
  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "debit",
      name: `Gift Purchased — ${gift.asset_name}`,
      description: "Added expired/cancelled gift to own portfolio",
      amount: gift.amount,
      store_reference: `GIFT2-SELF-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: now,
      created_at: now,
    });
  } catch (e) { console.warn("[gift/claim-to-self] tx insert:", e.message); }

  // Mark gift as claimed
  await db.from("gift_claims").update({
    status: "claimed",
    recipient_user_id: user.id,
    claimed_at: now,
  }).eq("id", gift.id);

  return res.json({
    success: true,
    holding_id: holdingId,
    asset_name: gift.asset_name,
  });
}
