import { supabaseAdmin, supabase as supabaseAnon } from "../_lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ success: false, error: { message: "userId is required" } });

  try {
    const db = supabaseAdmin || supabaseAnon;

    // If a pack_details row exists the user is fully verified
    const { data: packRecord } = await db
      .from("user_onboarding_pack_details")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (packRecord) {
      return res.json({ success: true, status: "verified", reviewStatus: "completed", reviewAnswer: "GREEN", rejectLabels: [], applicantId: null });
    }

    const { data: onboarding } = await db
      .from("user_onboarding")
      .select("kyc_status, sumsub_review_status, sumsub_review_answer, sumsub_applicant_id")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: actions } = await db
      .from("required_actions")
      .select("kyc_verified, kyc_pending, kyc_needs_resubmission")
      .eq("user_id", userId)
      .maybeSingle();

    let status = "not_verified";
    if (actions?.kyc_verified || onboarding?.kyc_status === "verified" || onboarding?.kyc_status === "onboarding_complete") {
      status = "verified";
    } else if (actions?.kyc_needs_resubmission || onboarding?.kyc_status === "resubmission_required") {
      status = "needs_resubmission";
    } else if (actions?.kyc_pending || onboarding?.kyc_status === "pending") {
      status = "pending";
    }

    return res.json({
      success: true,
      status,
      applicantId: onboarding?.sumsub_applicant_id || null,
      reviewStatus: onboarding?.sumsub_review_status || null,
      reviewAnswer: onboarding?.sumsub_review_answer || null,
      rejectLabels: [],
    });
  } catch (err) {
    console.error("[Experian Status]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
