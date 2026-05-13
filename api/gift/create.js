import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";
import { Resend } from "resend";
import crypto from "crypto";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mymint.co.za";

function buildGiftSentHtml({ senderName, recipientIdentifier, assetName, amountRands, message, claimUrl, isRegistration }) {
  const fmt = (v) => `R${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const actionLine = isRegistration
    ? `To receive this gift, ${recipientIdentifier} will first need to register on Mint and complete their FICA verification.`
    : `${recipientIdentifier} can claim this gift by clicking the button below.`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="background:white;border-radius:24px;padding:40px 32px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:800;color:#1e1b4b;">mint</div>
      <div style="color:#94a3b8;font-size:13px;">Investment Gift</div>
    </div>
    <p style="color:#334155;font-size:15px;line-height:1.6;">Hi ${senderName},</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin-bottom:24px;">
      Your gift of <strong style="color:#7c3aed;">${fmt(amountRands)}</strong> in <strong>${assetName}</strong> to <strong>${recipientIdentifier}</strong> has been sent.
    </p>
    ${message ? `<div style="background:#f8fafc;border-left:4px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:24px;"><p style="color:#4c1d95;font-size:14px;margin:0;">"${message}"</p></div>` : ""}
    <p style="color:#64748b;font-size:14px;line-height:1.6;">${actionLine}</p>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:32px;">Mint — Smart investing for South African families</p>
  </div>
</div></body></html>`;
}

function buildGiftRecipientHtml({ senderName, assetName, amountRands, message, claimUrl, isRegistration }) {
  const fmt = (v) => `R${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const btnLabel = isRegistration ? "Register & Claim Gift" : "Claim My Investment Gift";
  const subtext = isRegistration
    ? "You'll need to create an account and complete FICA verification before the gift is released to your portfolio."
    : "Click below to claim your gift. You'll need to be verified on Mint to receive it.";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="background:white;border-radius:24px;padding:40px 32px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:800;color:#1e1b4b;">mint</div>
      <div style="color:#94a3b8;font-size:13px;">You received an investment gift 🎁</div>
    </div>
    <p style="color:#334155;font-size:15px;line-height:1.6;"><strong>${senderName}</strong> has gifted you <strong style="color:#7c3aed;">${fmt(amountRands)}</strong> invested in <strong>${assetName}</strong>.</p>
    ${message ? `<div style="background:#ede9fe;border-left:4px solid #7c3aed;border-radius:8px;padding:16px 20px;margin:20px 0;"><p style="color:#4c1d95;font-size:14px;margin:0;">"${message}"</p></div>` : ""}
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:28px;">${subtext}</p>
    <div style="text-align:center;">
      <a href="${claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;padding:14px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">${btnLabel}</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:24px;">This gift expires in 30 days. If unclaimed, it will be returned to the sender.</p>
  </div>
</div></body></html>`;
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
    recipient_identifier,
    amount,
    asset_type,
    strategy_id,
    security_id,
    security_symbol,
    asset_name,
    message,
  } = req.body || {};

  if (!recipient_identifier?.trim()) return res.status(400).json({ error: "Recipient email or phone is required." });
  if (!amount || typeof amount !== "number" || amount <= 0) return res.status(400).json({ error: "Amount must be a positive number (in cents)." });
  if (!["strategy", "stock"].includes(asset_type)) return res.status(400).json({ error: "asset_type must be 'strategy' or 'stock'." });
  if (!asset_name) return res.status(400).json({ error: "asset_name is required." });
  if (asset_type === "strategy" && !strategy_id) return res.status(400).json({ error: "strategy_id required for strategy gifts." });
  if (asset_type === "stock" && !security_id) return res.status(400).json({ error: "security_id required for stock gifts." });

  const identifier = recipient_identifier.trim().toLowerCase();

  const { data: senderProfile } = await db.from("profiles").select("first_name, last_name, email").eq("id", user.id).maybeSingle();
  if (!senderProfile) return res.status(400).json({ error: "Sender profile not found." });
  if (senderProfile.email?.toLowerCase() === identifier) {
    return res.status(400).json({ error: "You cannot gift to yourself." });
  }

  const { data: wallet } = await db.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  const walletBalanceCents = Math.round(Number(wallet?.balance || 0) * 100);
  if (walletBalanceCents < amount) {
    return res.status(400).json({ error: "Insufficient wallet balance." });
  }

  const isEmail = identifier.includes("@");
  let recipientUserId = null;
  let recipientEmail = null;

  if (isEmail) {
    const { data: recipientProfile } = await db
      .from("profiles")
      .select("id, email")
      .eq("email", identifier)
      .maybeSingle();
    if (recipientProfile) {
      recipientUserId = recipientProfile.id;
      recipientEmail = recipientProfile.email;
    } else {
      recipientEmail = identifier;
    }
  } else {
    const { data: recipientProfile } = await db
      .from("profiles")
      .select("id, email, phone")
      .eq("phone", identifier)
      .maybeSingle();
    if (recipientProfile) {
      recipientUserId = recipientProfile.id;
      recipientEmail = recipientProfile.email;
    }
  }

  const status = recipientUserId ? "pending_claim" : "pending_registration";
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const newBalanceRands = (walletBalanceCents - amount) / 100;
  const { error: walletErr } = await db
    .from("wallets")
    .update({ balance: newBalanceRands })
    .eq("user_id", user.id);
  if (walletErr) return res.status(500).json({ error: "Failed to deduct from wallet." });

  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .insert({
      sender_user_id: user.id,
      recipient_identifier: identifier,
      recipient_user_id: recipientUserId,
      amount,
      asset_type,
      strategy_id: strategy_id || null,
      security_id: security_id || null,
      security_symbol: security_symbol || null,
      asset_name,
      token,
      status,
      message: message?.trim() || null,
      expires_at: expiresAt,
    })
    .select("id, token, status")
    .single();

  if (giftErr) {
    await db.from("wallets").update({ balance: walletBalanceCents / 100 }).eq("user_id", user.id);
    console.error("[gift/create] insert error:", giftErr.message);
    return res.status(500).json({ error: "Failed to create gift." });
  }

  try {
    await db.from("transactions").insert({
      user_id: user.id,
      direction: "debit",
      name: `Investment Gift — ${asset_name}`,
      description: `Gift to ${identifier}`,
      amount,
      store_reference: `GIFT-${gift.id}`,
      status: "posted",
    });
  } catch (e) { console.warn("[gift/create] tx insert:", e.message); }

  if (recipientUserId) {
    const amountRands = amount / 100;
    const senderName = [senderProfile.first_name, senderProfile.last_name].filter(Boolean).join(" ") || "Someone";
    try {
      await db.from("notifications").insert({
        user_id: recipientUserId,
        title: `🎁 You've received an investment gift!`,
        body: `${senderName} gifted you R${amountRands.toFixed(2)} in ${asset_name}. Tap to claim it.`,
        type: "investment",
        payload: { action: "gift_received", gift_id: gift.id, token, asset_name, amount },
      });
    } catch (e) { console.warn("[gift/create] notification insert:", e.message); }
  }

  const resend = getResend();
  if (resend) {
    const amountRands = amount / 100;
    const senderName = [senderProfile.first_name, senderProfile.last_name].filter(Boolean).join(" ") || "Someone";
    const claimPath = status === "pending_registration"
      ? `/register?gift=${gift.id}&token=${token}`
      : `/gift/claim/${token}`;
    const claimUrl = `${APP_URL}${claimPath}`;
    const isRegistration = status === "pending_registration";

    try {
      if (senderProfile.email) {
        await resend.emails.send({
          from: "Mint <noreply@mymint.co.za>",
          to: [senderProfile.email],
          subject: `Your gift of R${amountRands.toFixed(2)} in ${asset_name} has been sent`,
          html: buildGiftSentHtml({ senderName, recipientIdentifier: identifier, assetName: asset_name, amountRands, message, claimUrl, isRegistration }),
        });
      }
    } catch (e) { console.warn("[gift/create] sender email:", e.message); }

    if (isEmail && recipientEmail) {
      try {
        await resend.emails.send({
          from: "Mint <noreply@mymint.co.za>",
          to: [recipientEmail],
          subject: `${senderName} gifted you R${amountRands.toFixed(2)} on Mint 🎁`,
          html: buildGiftRecipientHtml({ senderName, assetName: asset_name, amountRands, message, claimUrl, isRegistration }),
        });
      } catch (e) { console.warn("[gift/create] recipient email:", e.message); }
    }
  }

  return res.json({
    success: true,
    gift_id: gift.id,
    status: gift.status,
    token: gift.token,
  });
}
