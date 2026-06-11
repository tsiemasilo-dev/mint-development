import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

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

  // Fetch this user's email and ID number so we can match pending gifts by identifier
  const { data: profile } = await db
    .from("profiles")
    .select("email, id_number")
    .eq("id", user.id)
    .maybeSingle();

  const userEmail = profile?.email?.toLowerCase() || "";
  const userIdNumber = profile?.id_number || "";

  // 1. Claimed gifts where recipient_user_id = this user
  const { data: claimedGifts, error: claimedErr } = await db
    .from("gift_claims")
    .select("id, amount, asset_type, asset_name, status, message, expires_at, created_at, claimed_at, cancelled_at, sender_user_id, recipient_identifier")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (claimedErr) return res.status(500).json({ error: "Failed to load received gifts." });

  // 2. Pending gifts addressed to this user by email or ID number (not yet claimed)
  let pendingGifts = [];
  const identifiers = [userEmail, userIdNumber].filter(Boolean);
  if (identifiers.length > 0) {
    const { data: byIdentifier } = await db
      .from("gift_claims")
      .select("id, amount, asset_type, asset_name, status, message, expires_at, created_at, claimed_at, cancelled_at, sender_user_id, recipient_identifier")
      .eq("status", "pending_claim")
      .in("recipient_identifier", identifiers)
      .order("created_at", { ascending: false })
      .limit(50);
    pendingGifts = byIdentifier || [];
  }

  // Collect unique sender IDs to fetch names
  const allGifts = [...pendingGifts, ...(claimedGifts || [])];
  const senderIds = [...new Set(allGifts.map(g => g.sender_user_id).filter(Boolean))];
  let senderMap = {};
  if (senderIds.length > 0) {
    const { data: senders } = await db
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", senderIds);
    (senders || []).forEach(s => {
      senderMap[s.id] = [s.first_name, s.last_name].filter(Boolean).join(" ") || "Someone";
    });
  }

  function formatGift(g, isPending = false) {
    let personalMessage = null;
    try { personalMessage = JSON.parse(g.message || "{}").msg || null; } catch {}
    return {
      ...g,
      sender_name: senderMap[g.sender_user_id] || "Someone",
      personal_message: personalMessage,
      unclaimed: isPending,
    };
  }

  const active = pendingGifts.map(g => formatGift(g, true));
  const history = (claimedGifts || []).map(g => formatGift(g, false));

  return res.json({ active, history });
}
