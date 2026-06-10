import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

// Latest stock_intraday_c.current_price per security_id — stamped as
// Expected_fill so claimed-gift PnL is anchored to the live price at claim time.
async function fetchLatestIntradayPrices(db, securityIds) {
  if (!securityIds || !securityIds.length) return {};
  const ids = [...new Set(securityIds.filter(Boolean))];
  const out = {};
  await Promise.all(ids.map(async (id) => {
    const { data } = await db
      .from("stock_intraday_c")
      .select("current_price")
      .eq("security_id", id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.current_price != null) {
      // stock_intraday_c.current_price is stored in cents; return rands.
      out[id] = Number(data.current_price) / 100;
    }
  }));
  return out;
}

async function allocateStrategyHoldings(db, userId, strategyId, strategyHoldings, amountCents, transactionId) {
  const investAmountRands = amountCents / 100;
  if (!strategyHoldings.length) return 0;

  const symbols = strategyHoldings.map(h => h.symbol).filter(Boolean);
  const { data: securities } = await db
    .from("securities_c").select("id, symbol, last_price").in("symbol", symbols);
  const secMap = {};
  (securities || []).forEach(s => { secMap[s.symbol] = s; });

  const intradayPrices = await fetchLatestIntradayPrices(db, (securities || []).map(s => s.id));

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
          transaction_id: transactionId || null,
          Expected_fill: intradayPrices[sec.id] ?? null,
        });
        created++;
      } catch (e) { console.warn(`[gift/claim-v2] holding upsert ${h.symbol}:`, e.message); }
    }
  }
  return created;
}

async function allocateStockHolding(db, userId, securityId, amountCents, transactionId) {
  const { data: sec } = await db
    .from("securities_c").select("id, symbol, last_price").eq("id", securityId).maybeSingle();
  if (!sec?.last_price) return { qty: 0, holdingId: null };

  const qty = Math.max(1, Math.floor((amountCents / 100) / sec.last_price));

  const intradayPrices = await fetchLatestIntradayPrices(db, [sec.id]);

  try {
    // Always insert a NEW row per gift-claimed stock so each claim is a
    // discrete pending position with its own broker-fill lifecycle. Matches
    // the strategy-claim pattern; the stacked-card UI groups by created_at.
    const { data: inserted } = await db.from("stock_holdings_c").insert({
      user_id: userId, security_id: sec.id, quantity: qty,
      avg_fill: null, market_value: 0,
      unrealized_pnl: 0, as_of_date: null,
      Status: "active",
      transaction_id: transactionId || null,
      Expected_fill: intradayPrices[sec.id] ?? null,
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

  const cleanCode = String(code).replace(/\D/g, "");

  // Fetch the authenticated user's profile
  const { data: claimantProfile } = await db
    .from("profiles").select("id, id_number, first_name, last_name, mint_number")
    .eq("id", user.id).maybeSingle();

  if (!claimantProfile) return res.status(400).json({ error: "Profile not found." });

  // If id_number is provided, verify it matches the profile (for non-logged-in flows)
  if (id_number?.trim()) {
    const cleanId = String(id_number).replace(/\D/g, "");
    if (claimantProfile.id_number !== cleanId) {
      return res.status(403).json({ error: "SA ID number does not match your account." });
    }
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

  const now = new Date().toISOString();

  // Insert transaction for recipient first so we can stamp its UUID on holdings rows.
  // Use the same format as record-investment.js (debit, "Strategy Investment: X")
  // so the gift flows through the exact same pending-orders code path as a
  // regular strategy purchase — no separate UI branch needed.
  let giftTxId = null;
  try {
    const txName = gift.asset_type === "strategy"
      ? `Strategy Investment: ${gift.asset_name}`
      : `Purchased ${gift.asset_name}`;
    const txInsert = await db.from("transactions").insert({
      user_id: user.id,
      direction: "debit",
      name: txName,
      description: "Investment gift claimed",
      amount: gift.amount,
      store_reference: `GIFT2-CLAIM-${gift.id}`,
      currency: "ZAR",
      status: "posted",
      transaction_date: now,
      created_at: now,
    }).select("id").single();
    giftTxId = txInsert.data?.id || null;
  } catch (e) { console.warn("[gift/claim-v2] tx insert:", e.message); }

  if (gift.asset_type === "strategy" && gift.strategy_id) {
    const { data: strategy } = await db
      .from("strategies_c").select("id, holdings").eq("id", gift.strategy_id).maybeSingle();
    holdingsCreated = await allocateStrategyHoldings(
      db, user.id, gift.strategy_id, strategy?.holdings || [], gift.amount, giftTxId
    );
  } else if (gift.asset_type === "stock" && gift.security_id) {
    const result = await allocateStockHolding(db, user.id, gift.security_id, gift.amount, giftTxId);
    holdingsCreated = result.qty > 0 ? 1 : 0;
    holdingId = result.holdingId;
  }

  if (holdingsCreated === 0) {
    return res.status(500).json({ error: "Failed to allocate holdings. Please try again." });
  }

  // Deduct from sender's wallet — funds were held at create time, now settle the debit.
  try {
    const { data: senderWallet } = await db.from("wallets").select("balance").eq("user_id", gift.sender_user_id).maybeSingle();
    if (senderWallet) {
      const amountRands = Number(gift.amount) / 100;
      const newBalance = Math.max(0, Number(senderWallet.balance) - amountRands);
      await db.from("wallets").update({ balance: newBalance }).eq("user_id", gift.sender_user_id);
      // Settle the hold transaction to "posted" so it appears in the sender's history
      await db.from("transactions")
        .update({ status: "posted", description: "Gift claimed — investment transferred" })
        .eq("store_reference", `GIFT2-HOLD-${gift.id}`)
        .eq("user_id", gift.sender_user_id);
    }
  } catch (e) { console.warn("[gift/claim-v2] sender wallet debit:", e.message); }

  // Mark gift claimed — also store recipient_identifier if we have it
  const claimUpdate = {
    status: "claimed",
    recipient_user_id: user.id,
    claimed_at: now,
  };
  if (id_number?.trim()) claimUpdate.recipient_identifier = String(id_number).replace(/\D/g, "");
  await db.from("gift_claims").update(claimUpdate).eq("id", gift.id);

  // Mark the recipient's gift_received notification as read so the banner dismisses
  try {
    await db.from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .eq("type", "system")
      .is("read_at", null);
  } catch (e) { console.warn("[gift/claim-v2] mark notification read:", e.message); }

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
