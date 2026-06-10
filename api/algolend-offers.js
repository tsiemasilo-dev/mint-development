/**
 * POST /api/algolend-offers
 *
 * Server-side proxy: takes the authenticated user's stored credit check result
 * and calls AlgoLend's /api/marketplace/evaluate endpoint.
 *
 * MINT_API_KEY and ALGOLEND_BASE_URL must be set as environment variables.
 * Never expose these to the browser.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ALGOLEND_URL = (process.env.ALGOLEND_BASE_URL || "https://app.algolend.co.za").replace(/\/$/, "");
const ALGOLEND_API_KEY = process.env.ALGOLEND_API_KEY || process.env.MINT_API_KEY;

function mapContractTypeToEmploymentStatus(contractType) {
  if (!contractType) return "unknown";
  const ct = String(contractType).toUpperCase();
  if (ct.startsWith("SELF_EMPLOYED")) return "self_employed";
  if (ct === "UNEMPLOYED_OR_UNKNOWN") return "unemployed";
  if (ct === "PERMANENT" || ct === "PERMANENT_ON_PROBATION") return "employed";
  if (ct.startsWith("FIXED_TERM") || ct === "PART_TIME") return "employed";
  return "unknown";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!accessToken) return res.status(401).json({ error: "Missing bearer token" });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  // Authenticate the user
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Parse loan request details from body
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const requestedAmount = Number(body.requestedAmount) || 50000;
  const termMonths = Number(body.termMonths) || 24;
  const mintRequestRef = body.mintRequestRef || `MINT-${Date.now()}`;

  // Load latest credit assessment from Supabase
  const { data: scoreRow, error: scoreError } = await supabase
    .from("loan_engine_score")
    .select("experian_score, engine_score, engine_result, annual_income, contract_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scoreError || !scoreRow) {
    return res.status(400).json({
      error: "No credit assessment found. Please complete your credit check first.",
      code: "NO_SCORE",
    });
  }

  if (!scoreRow.experian_score) {
    return res.status(400).json({
      error: "Credit check did not return a valid Experian score. Please re-run your assessment.",
      code: "MISSING_EXPERIAN_SCORE",
    });
  }

  // Map stored engine result to AlgoLend credit profile
  const engineResult = scoreRow.engine_result || {};
  const dti = engineResult.dti || {};
  const adverseListings = engineResult.adverseListings || {};
  const algoHive = engineResult.algoHiveBehavioural || {};
  const bankCashflows = engineResult.bankStatementCashflows || {};

  const monthlyIncome =
    dti.grossMonthlyIncome ||
    bankCashflows.avgMonthlyIncome ||
    (Number(scoreRow.annual_income) > 0 ? scoreRow.annual_income / 12 : 0);

  const existingObligations =
    dti.totalMonthlyDebt ||
    bankCashflows.averageMonthlyDebtRepayments ||
    0;

  const profile = {
    // Credit data from Experian
    creditScore: scoreRow.experian_score,
    monthlyIncome: Math.round(monthlyIncome),
    existingMonthlyObligations: Math.round(existingObligations),
    openDefaults: Number(adverseListings.totalAdverse) || 0,
    idVerified: Boolean(algoHive.identityVerified ?? true),
    employmentStatus: mapContractTypeToEmploymentStatus(scoreRow.contract_type),

    // Loan request
    requestedAmount,
    termMonths,

    // Audit linkage
    mintUserId: user.id,
    mintRequestRef,
  };

  if (!ALGOLEND_API_KEY) {
    console.warn("[algolend-offers] ALGOLEND_API_KEY not set — requests will be unauthenticated");
  }

  // Call AlgoLend evaluate API
  let algolendResponse;
  try {
    algolendResponse = await fetch(`${ALGOLEND_URL}/api/marketplace/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALGOLEND_API_KEY ? { Authorization: `Bearer ${ALGOLEND_API_KEY}` } : {}),
      },
      body: JSON.stringify(profile),
    });
  } catch (fetchError) {
    console.error("[algolend-offers] fetch failed:", fetchError.message);
    return res.status(502).json({ error: "Could not reach AlgoLend. Please try again." });
  }

  const data = await algolendResponse.json().catch(() => ({}));

  if (!algolendResponse.ok) {
    console.error("[algolend-offers] AlgoLend error:", data.error);
    return res.status(502).json({ error: data.error || "AlgoLend evaluation failed." });
  }

  console.log(`[algolend-offers] user=${user.id} creditScore=${scoreRow.experian_score} offers=${data.offersCount ?? 0}`);

  return res.status(200).json(data);
}
