import { supabase, supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token is required." });

  const { data: gift, error } = await db
    .from("gift_claims")
    .select("id, amount, asset_type, asset_name, status, message, expires_at, sender_user_id")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("[gift/token] lookup error:", error.message);
    return res.status(500).json({ error: "Failed to load gift." });
  }
  if (!gift) return res.status(404).json({ error: "Gift not found." });

  let senderName = "Someone";
  try {
    const { data: sender } = await db
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", gift.sender_user_id)
      .maybeSingle();
    if (sender) {
      senderName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "Someone";
    }
  } catch (_) {}

  return res.json({
    id: gift.id,
    amount: gift.amount,
    asset_type: gift.asset_type,
    asset_name: gift.asset_name,
    status: gift.status,
    message: gift.message,
    expires_at: gift.expires_at,
    sender_name: senderName,
  });
}
