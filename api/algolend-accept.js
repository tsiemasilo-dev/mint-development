/**
 * POST /api/algolend-accept
 *
 * Records the borrower's chosen loan offer back to AlgoLend.
 * Proxied server-side so ALGOLEND_API_KEY stays off the client.
 *
 * Body: { requestId, lenderId, mintRequestRef? }
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ALGOLEND_URL = (process.env.ALGOLEND_BASE_URL || "https://app.algolend.co.za").replace(/\/$/, "");
const ALGOLEND_API_KEY = process.env.ALGOLEND_API_KEY || process.env.MINT_API_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!accessToken) return res.status(401).json({ error: "Missing bearer token" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { requestId, lenderId } = body;
  if (!requestId || !lenderId) {
    return res.status(422).json({ error: "Required: requestId, lenderId" });
  }

  let algolendResponse;
  try {
    algolendResponse = await fetch(`${ALGOLEND_URL}/api/marketplace/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGOLEND_API_KEY ? { Authorization: `Bearer ${ALGOLEND_API_KEY}` } : {}),
      },
      body: JSON.stringify({ requestId, lenderId, mintUserId: user.id }),
    });
  } catch (fetchError) {
    console.error("[algolend-accept] fetch failed:", fetchError.message);
    return res.status(502).json({ error: "Could not reach AlgoLend. Please try again." });
  }

  const data = await algolendResponse.json().catch(() => ({}));
  if (!algolendResponse.ok) {
    return res.status(algolendResponse.status).json({ error: data.error || "Accept failed." });
  }

  console.log(`[algolend-accept] user=${user.id} requestId=${requestId} lenderId=${lenderId}`);
  return res.status(200).json(data);
}
