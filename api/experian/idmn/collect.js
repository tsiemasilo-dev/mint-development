import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../../_lib/supabase.js";
import {
  EXPERIAN_IDMN_BASE,
  experianRequest,
  experianBasicAuth,
  isMockMode,
} from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    const { user, error: authErr } = await authenticateUser(req);
    if (authErr || !user) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });

    const userId = user.id;
    const db = supabaseAdmin || supabaseAnon;

    const { data: onboarding } = await db
      .from("user_onboarding")
      .select("sumsub_raw")
      .eq("user_id", userId)
      .maybeSingle();

    let raw = {};
    try { raw = typeof onboarding?.sumsub_raw === "string" ? JSON.parse(onboarding.sumsub_raw) : (onboarding?.sumsub_raw || {}); } catch {}

    const transaction_id = raw?.experian_idmn_transaction_id;
    const token = raw?.experian_idmn_token;
    if (!transaction_id || !token) {
      return res.status(400).json({ success: false, error: { message: "No pending verification found. Please start the verification first." } });
    }

    const MOCK = isMockMode() || raw?.experian_mock;

    if (MOCK) {
      console.log(`[Experian IDMN] MOCK MODE — CollectWorkflowResults for user ${userId}`);
      const verifiedRaw = { ...raw, experian_idmn_status: "verified", experian_idmn_completed_at: new Date().toISOString(), experian_mock: true };
      await db.from("user_onboarding").update({ sumsub_raw: verifiedRaw, kyc_status: "onboarding_complete", kyc_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
      await db.from("required_actions").update({ kyc_verified: true, kyc_pending: false, kyc_needs_resubmission: false, kyc_verified_at: new Date().toISOString() }).eq("user_id", userId);
      const { data: packCheck } = await db.from("user_onboarding_pack_details").select("user_id").eq("user_id", userId).maybeSingle();
      if (!packCheck) { await db.from("user_onboarding_pack_details").insert({ user_id: userId, created_at: new Date().toISOString() }); }
      return res.json({ success: true, status: "verified", mockMode: true, message: "Mock verification complete." });
    }

    /* transaction_id is a 19-20 digit integer — too large for a JS Number
       (loses precision past 16 digits). Build the JSON with a placeholder, then
       inject the raw digits as an unquoted numeric literal so the exact value
       reaches Experian (matches the spec's CollectWorkflowResults example). */
    const txidIsNumeric = /^\d+$/.test(String(transaction_id));
    const collectBody = {
      system_settings: {
        version: "1.0",
        originating_application: "MINT",
        originating_environment: process.env.EXPERIAN_ENV === "production" ? "PRODUCTION" : "UAT",
        client_reference: userId,
        request_time: new Date().toISOString().slice(0, 19),
      },
      search_criteria: {
        transaction_id: txidIsNumeric ? "__TXID__" : String(transaction_id),
        reference: token,
      },
    };
    let collectBodyStr = JSON.stringify(collectBody);
    if (txidIsNumeric) collectBodyStr = collectBodyStr.replace('"__TXID__"', String(transaction_id));

    console.log(`[Experian IDMN] CollectWorkflowResults for user ${userId}, tx: ${transaction_id}`);
    const { status: httpStatus, data: collectResult } = await experianRequest(
      `${EXPERIAN_IDMN_BASE}/CollectWorkflowResults`,
      collectBodyStr,
      { Authorization: experianBasicAuth() }
    );
    console.log(`[Experian IDMN] CollectWorkflowResults HTTP ${httpStatus}:`, JSON.stringify(collectResult).slice(0, 800));

    const errorCode = collectResult?.error_code;
    let kycStatus = "pending";
    let reviewAnswer = null;

    if (collectResult?.response_status === "Success") {
      kycStatus = "verified"; reviewAnswer = "GREEN";
    } else if (errorCode === "IMN_202") {
      kycStatus = "pending";
    } else if (errorCode === "IMN_205" || errorCode === "IMN_208") {
      kycStatus = "not_verified";
    } else if (collectResult?.response_status === "Failure") {
      kycStatus = "failed"; reviewAnswer = "RED";
    }

    const updatedRaw = { ...raw, experian_idmn_result: collectResult, experian_idmn_collected_at: new Date().toISOString() };
    const onboardingUpdate = {
      sumsub_raw: updatedRaw,
      sumsub_review_status: kycStatus,
      sumsub_review_answer: reviewAnswer,
      kyc_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (kycStatus === "verified") {
      onboardingUpdate.kyc_status = "verified";
      onboardingUpdate.kyc_verified_at = new Date().toISOString();
    } else if (kycStatus === "failed") {
      onboardingUpdate.kyc_status = "resubmission_required";
    }

    await db.from("user_onboarding").update(onboardingUpdate).eq("user_id", userId);

    let raPayload = { kyc_pending: true, kyc_verified: false, kyc_needs_resubmission: false };
    if (kycStatus === "verified") {
      raPayload = { kyc_pending: false, kyc_verified: true, kyc_needs_resubmission: false };
      const { data: existingPack } = await db.from("user_onboarding_pack_details").select("user_id").eq("user_id", userId).maybeSingle();
      if (!existingPack) {
        await db.from("user_onboarding_pack_details").insert({
          user_id: userId,
          pack_details: { experian_idmn: collectResult, verified_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        });
      }
    } else if (kycStatus === "failed") {
      raPayload = { kyc_pending: false, kyc_verified: false, kyc_needs_resubmission: true };
    }

    const { data: existingAction } = await db.from("required_actions").select("id").eq("user_id", userId).maybeSingle();
    if (existingAction) { await db.from("required_actions").update(raPayload).eq("user_id", userId); }
    else { await db.from("required_actions").insert({ user_id: userId, ...raPayload }); }

    return res.json({ success: true, status: kycStatus, errorCode: errorCode || null, collectResult });
  } catch (err) {
    console.error("[Experian IDMN Collect]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
