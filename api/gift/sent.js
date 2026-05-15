import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

function parseRecipientName(messageJson) {
  try {
    const parsed = JSON.parse(messageJson || "{}");
    return [parsed.fn, parsed.ln].filter(Boolean).join(" ") || null;
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: gifts, error } = await db
    .from("gift_claims")
    .select("id, amount, asset_type, asset_name, token, status, message, expires_at, created_at, claimed_at, cancelled_at")
    .eq("sender_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: "Failed to load gifts." });

  const formatted = (gifts || []).map(g => ({
    ...g,
    recipient_name: parseRecipientName(g.message),
    personal_message: (() => { try { return JSON.parse(g.message || "{}").msg || null; } catch { return null; } })(),
  }));

  const active = formatted.filter(g => g.status === "pending_claim");
  const history = formatted.filter(g => g.status !== "pending_claim");

  return res.json({ active, history });
}
