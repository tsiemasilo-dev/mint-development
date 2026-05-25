import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";
import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

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
      out[id] = Number(data.current_price);
    }
  }));
  return out;
}

function buildClaimedHtml({ recipientName, senderName, assetName, amountRands }) {
  const fmt = (v) => `R${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="background:white;border-radius:24px;padding:40px 32px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:800;color:#1e1b4b;">mint</div>
    </div>
    <p style="color:#334155;font-size:15px;">Hi ${recipientName},</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;">
      You've successfully claimed <strong style="color:#7c3aed;">${fmt(amountRands)}</strong> in <strong>${assetName}</strong> — gifted by <strong>${senderName}</strong>. It's now in your portfolio!
    </p>
    <div style="text-align:center;margin-top:28px;">
      <a href="https://mymint.co.za" style="display:inline-block;background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;padding:14px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">View My Portfolio</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:24px;">Mint — Smart investing for South African families</p>
  </div>
</div></body></html>`;
}

async function allocateStrategyHoldings(db, userId, strategyId, strategyHoldings, amountCents, transactionId) {
  const investAmountRands = amountCents / 100;
  let holdingsCreated = 0;
  if (!strategyHoldings.length) return 0;

  const symbols = strategyHoldings.map(h => h.symbol).filter(Boolean);
  const { data: securities } = await db
    .from("securities_c")
    .select("id, symbol, name, last_price, logo_url")
    .in("symbol", symbols);

  const secMap = {};
  (securities || []).forEach(s => { secMap[s.symbol] = s; });

  const intradayPrices = await fetchLatestIntradayPrices(db, (securities || []).map(s => s.id));

  let totalBasketCostRands = 0;
  for (const h of strategyHoldings) {
    const sec = secMap[h.symbol];
    if (sec?.last_price) totalBasketCostRands += sec.last_price * (h.weight || 1);
  }

  if (totalBasketCostRands > 0) {
    const scale = investAmountRands / totalBasketCostRands;
    for (const h of strategyHoldings) {
      const sec = secMap[h.symbol];
      if (!sec?.last_price) continue;
      const qty = Math.floor((h.weight || 1) * scale);
      if (qty <= 0) continue;

      const avgFillCents = Math.round(sec.last_price * 100);
      const marketValueCents = Math.round(qty * sec.last_price * 100);

      try {
        // Always insert a NEW row per gift-claimed strategy purchase so duplicate
        // buys remain distinguishable in stock_holdings_c.
        await db.from("stock_holdings_c").insert({
          user_id: userId,
          security_id: sec.id,
          quantity: qty,
          avg_fill: avgFillCents,
          market_value: marketValueCents,
          unrealized_pnl: 0,
          as_of_date: new Date().toISOString().split("T")[0],
          strategy_id: strategyId,
          Status: "active",
          transaction_id: transactionId || null,
          Expected_fill: intradayPrices[sec.id] ?? null,
        });
        holdingsCreated++;
      } catch (e) {
        console.warn(`[gift/claim] holding insert for ${h.symbol}:`, e.message);
      }
    }
  }

  if (holdingsCreated === 0) {
    const sorted = [...strategyHoldings].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const fallbackSec = secMap[sorted[0]?.symbol];
    if (fallbackSec) {
      try {
        const priceCents = Math.round(fallbackSec.last_price * 100);
        await db.from("stock_holdings_c").insert({
          user_id: userId,
          security_id: fallbackSec.id,
          quantity: 1,
          avg_fill: priceCents,
          market_value: priceCents,
          unrealized_pnl: 0,
          as_of_date: new Date().toISOString().split("T")[0],
          strategy_id: strategyId,
          Status: "active",
          transaction_id: transactionId || null,
          Expected_fill: intradayPrices[fallbackSec.id] ?? null,
        });
        holdingsCreated = 1;
      } catch (e) {
        console.warn("[gift/claim] strategy fallback holding:", e.message);
      }
    }
  }

  return holdingsCreated;
}

async function allocateStockHolding(db, userId, securityId, amountCents, transactionId) {
  const { data: sec } = await db
    .from("securities_c")
    .select("id, symbol, last_price")
    .eq("id", securityId)
    .maybeSingle();

  if (!sec?.last_price) return 0;

  const amountRands = amountCents / 100;
  const qty = Math.floor(amountRands / sec.last_price);
  const finalQty = qty > 0 ? qty : 1;
  const avgFillCents = Math.round(sec.last_price * 100);
  const marketValueCents = Math.round(finalQty * sec.last_price * 100);

  const intradayPrices = await fetchLatestIntradayPrices(db, [sec.id]);

  try {
    // Always insert a NEW row per gift-claimed stock so duplicate stock buys
    // remain distinguishable in stock_holdings_c (mirrors the strategy-claim
    // pattern; the stacked-card UI groups them by created_at minute).
    await db.from("stock_holdings_c").insert({
      user_id: userId,
      security_id: sec.id,
      quantity: finalQty,
      avg_fill: avgFillCents,
      market_value: marketValueCents,
      unrealized_pnl: 0,
      as_of_date: new Date().toISOString().split("T")[0],
      Status: "active",
      transaction_id: transactionId || null,
      Expected_fill: intradayPrices[sec.id] ?? null,
    });
    return finalQty;
  } catch (e) {
    console.warn("[gift/claim] stock holding insert:", e.message);
    return 0;
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

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "Token is required." });

  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found." });

  if (gift.status === "claimed") return res.status(400).json({ error: "This gift has already been claimed." });
  if (gift.status === "expired") return res.status(400).json({ error: "This gift has expired." });
  if (gift.status === "cancelled") return res.status(400).json({ error: "This gift was cancelled." });
  if (gift.status === "pending_registration") {
    return res.status(400).json({ error: "You need to complete registration and KYC before claiming this gift." });
  }
  if (new Date(gift.expires_at) < new Date()) {
    return res.status(400).json({ error: "This gift has expired." });
  }
  if (gift.sender_user_id === user.id) {
    return res.status(400).json({ error: "You cannot claim your own gift." });
  }
  if (gift.recipient_user_id && gift.recipient_user_id !== user.id) {
    return res.status(403).json({ error: "This gift was sent to a different account." });
  }

  const { data: onboarding } = await db
    .from("user_onboarding")
    .select("kyc_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const kycStatus = onboarding?.kyc_status;
  if (kycStatus !== "verified" && kycStatus !== "onboarding_complete") {
    return res.status(403).json({ error: "FICA verification required to claim this gift.", kyc_required: true });
  }

  let holdingsAllocated = 0;

  // Insert transaction first so we can stamp its UUID on every holdings row.
  let giftTxId = null;
  try {
    const txInsert = await db.from("transactions").insert({
      user_id: user.id,
      direction: "credit",
      name: `Gift Received — ${gift.asset_name}`,
      description: `Investment gift from sender`,
      amount: gift.amount,
      store_reference: `GIFT-CLAIM-${gift.id}`,
      status: "posted",
    }).select("id").single();
    giftTxId = txInsert.data?.id || null;
  } catch (e) { console.warn("[gift/claim] tx insert:", e.message); }

  if (gift.asset_type === "strategy" && gift.strategy_id) {
    const { data: strategy } = await db
      .from("strategies_c")
      .select("id, holdings")
      .eq("id", gift.strategy_id)
      .maybeSingle();

    const strategyHoldings = strategy?.holdings || [];
    holdingsAllocated = await allocateStrategyHoldings(db, user.id, gift.strategy_id, strategyHoldings, gift.amount, giftTxId);
  } else if (gift.asset_type === "stock" && gift.security_id) {
    holdingsAllocated = await allocateStockHolding(db, user.id, gift.security_id, gift.amount, giftTxId);
  }

  if (holdingsAllocated === 0) {
    console.error(`[gift/claim] failed to allocate any holdings for gift ${gift.id}`);
    return res.status(500).json({ error: "Failed to allocate holdings. Please try again." });
  }

  const { error: updateErr } = await db
    .from("gift_claims")
    .update({ status: "claimed", recipient_user_id: user.id, claimed_at: new Date().toISOString() })
    .eq("id", gift.id);

  if (updateErr) {
    console.error("[gift/claim] status update error:", updateErr.message);
    return res.status(500).json({ error: "Failed to finalise claim." });
  }

  const resend = getResend();
  if (resend) {
    try {
      const [{ data: recipient }, { data: sender }] = await Promise.all([
        db.from("profiles").select("first_name, last_name, email").eq("id", user.id).maybeSingle(),
        db.from("profiles").select("first_name, last_name").eq("id", gift.sender_user_id).maybeSingle(),
      ]);
      if (recipient?.email) {
        const recipientName = [recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || "there";
        const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(" ") || "Someone";
        await resend.emails.send({
          from: "Mint <noreply@mymint.co.za>",
          to: [recipient.email],
          subject: `Your investment gift is now in your portfolio — ${gift.asset_name}`,
          html: buildClaimedHtml({ recipientName, senderName, assetName: gift.asset_name, amountRands: gift.amount / 100 }),
        });
      }
    } catch (e) { console.warn("[gift/claim] email:", e.message); }
  }

  return res.json({
    success: true,
    holdings_allocated: holdingsAllocated,
    amount: gift.amount,
    asset_name: gift.asset_name,
    asset_type: gift.asset_type,
  });
}
