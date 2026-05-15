import { supabase, supabaseAdmin } from "../_lib/supabase.js";

// In-memory rate limiter: ip → { count, resetAt }
const rateLimitStore = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many attempts. Please wait 10 minutes before trying again." });
  }

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { id_number, code } = req.body || {};
  if (!id_number?.trim() || String(id_number).replace(/\D/g, "").length !== 13) {
    return res.status(400).json({ error: "A valid 13-digit SA ID number is required." });
  }
  if (!code || String(code).replace(/\D/g, "").length !== 6) {
    return res.status(400).json({ error: "A valid 6-digit gift code is required." });
  }

  const cleanCode = String(code).replace(/\D/g, "");
  const cleanId = String(id_number).replace(/\D/g, "");

  // Look up gift
  const { data: gift, error: giftErr } = await db
    .from("gift_claims")
    .select("id, sender_user_id, amount, asset_type, asset_name, message, status, expires_at")
    .eq("token", cleanCode)
    .eq("status", "pending_claim")
    .maybeSingle();

  if (giftErr) return res.status(500).json({ error: "Failed to look up gift." });
  if (!gift) return res.status(404).json({ error: "Gift not found. Check the code and try again." });
  if (new Date(gift.expires_at) < new Date()) {
    return res.status(400).json({ error: "This gift has expired." });
  }

  // Sender name for preview
  let senderName = "Someone";
  try {
    const { data: sender } = await db
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", gift.sender_user_id)
      .maybeSingle();
    if (sender) senderName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "Someone";
  } catch (_) {}

  // Parse message JSON for personal message
  let personalMessage = null;
  try {
    const parsed = JSON.parse(gift.message || "{}");
    personalMessage = parsed.msg || null;
  } catch (_) {}

  // Check if SA ID is registered
  const { data: profile } = await db
    .from("profiles")
    .select("id, first_name, last_name, mint_number")
    .eq("id_number", cleanId)
    .maybeSingle();

  if (!profile) {
    return res.json({
      registration_status: "not_registered",
      kyc_status: null,
      mint_number_set: false,
      gift_preview: {
        asset_name: gift.asset_name,
        sender_name: senderName,
        message: personalMessage,
        expires_at: gift.expires_at,
      },
    });
  }

  const { data: onboarding } = await db
    .from("user_onboarding")
    .select("kyc_status")
    .eq("user_id", profile.id)
    .maybeSingle();

  const kycStatus = onboarding?.kyc_status || "pending";
  const kycDone = kycStatus === "verified" || kycStatus === "onboarding_complete";
  const mintNumberSet = !!profile.mint_number;

  return res.json({
    registration_status: "registered",
    kyc_status: kycStatus,
    kyc_done: kycDone,
    mint_number_set: mintNumberSet,
    gift_preview: {
      asset_name: gift.asset_name,
      sender_name: senderName,
      message: personalMessage,
      expires_at: gift.expires_at,
    },
  });
}
