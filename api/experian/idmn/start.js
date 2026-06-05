import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../../_lib/supabase.js";
import {
  EXPERIAN_IDMN_BASE,
  EXPERIAN_IDMN_WORKFLOW_ID,
  EXPERIAN_IDMN_HOSTED_BASE,
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
      .select("sumsub_raw, kyc_status, sumsub_applicant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (onboarding?.kyc_status === "verified" || onboarding?.kyc_status === "onboarding_complete") {
      return res.json({ success: true, alreadyVerified: true, status: onboarding.kyc_status });
    }

    let raw = {};
    try { raw = typeof onboarding?.sumsub_raw === "string" ? JSON.parse(onboarding.sumsub_raw) : (onboarding?.sumsub_raw || {}); } catch {}

    // Return existing URL if workflow already started
    if (raw?.experian_idmn_transaction_id && raw?.experian_idmn_token) {
      const url = `${EXPERIAN_IDMN_HOSTED_BASE}/${raw.experian_idmn_token}`;
      return res.json({ success: true, url, transaction_id: String(raw.experian_idmn_transaction_id), token: raw.experian_idmn_token, existing: true });
    }

    const identityNumber = req.body?.identity_number || raw?.identity_details?.identity_number;
    if (!identityNumber) {
      return res.status(400).json({ success: false, error: { message: "Identity number not found. Please complete the ID number step first." } });
    }

    const MOCK = isMockMode();

    if (MOCK) {
      console.log(`[Experian IDMN] MOCK MODE — StartWorkflow for user ${userId}`);
      const mockTxId = `mock-${Date.now()}`;
      const mockToken = `mock-token-${userId.slice(0, 8)}`;
      const updatedRaw = { ...raw, experian_idmn_transaction_id: mockTxId, experian_idmn_token: mockToken, experian_idmn_started_at: new Date().toISOString(), experian_mock: true };
      await db.from("user_onboarding").update({ sumsub_raw: updatedRaw, sumsub_applicant_id: mockTxId, kyc_status: "pending", kyc_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
      const { data: existingAction } = await db.from("required_actions").select("id").eq("user_id", userId).maybeSingle();
      const raPayload = { kyc_pending: true, kyc_verified: false, kyc_needs_resubmission: false };
      if (existingAction) { await db.from("required_actions").update(raPayload).eq("user_id", userId); }
      else { await db.from("required_actions").insert({ user_id: userId, ...raPayload }); }
      return res.json({ success: true, mockMode: true, url: null, transaction_id: mockTxId, token: mockToken });
    }

    const { data: profile } = await db.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();
    const name = profile?.first_name || req.body?.forename || "Unknown";
    const surname = profile?.last_name || req.body?.surname || "Unknown";

    const idmnBody = {
      system_settings: {
        version: "1.0",
        originating_application: "MINT",
        originating_environment: process.env.EXPERIAN_ENV === "production" ? "PRODUCTION" : "UAT",
        client_reference: userId,
        request_time: new Date().toISOString().slice(0, 19),
      },
      search_criteria: {
        identity_number: identityNumber,
        identity_type: "SID",
        name,
        surname,
        client_consent: "Y",
        workflow_id: EXPERIAN_IDMN_WORKFLOW_ID,
      },
    };

    console.log(`[Experian IDMN] StartWorkflow for user ${userId}`);
    const { status: httpStatus, data: idmnResult } = await experianRequest(
      `${EXPERIAN_IDMN_BASE}/StartWorkflow`,
      idmnBody,
      { Authorization: experianBasicAuth() }
    );
    console.log(`[Experian IDMN] StartWorkflow HTTP ${httpStatus}:`, JSON.stringify(idmnResult).slice(0, 600));

    if (idmnResult?.response_status !== "Success") {
      const errMsg = idmnResult?.error_description || `Experian error: ${idmnResult?.response_status || "Unknown"}`;
      return res.status(502).json({ success: false, error: { message: errMsg, code: idmnResult?.error_code } });
    }

    const { transaction_id, token, url } = idmnResult.return_data || {};

    const updatedRaw = {
      ...raw,
      experian_idmn_transaction_id: String(transaction_id),
      experian_idmn_token: token,
      experian_idmn_started_at: new Date().toISOString(),
    };

    await db.from("user_onboarding").update({
      sumsub_raw: updatedRaw,
      sumsub_applicant_id: String(transaction_id),
      kyc_status: "pending",
      kyc_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    const { data: existingAction } = await db.from("required_actions").select("id").eq("user_id", userId).maybeSingle();
    const raPayload = { kyc_pending: true, kyc_verified: false, kyc_needs_resubmission: false };
    if (existingAction) { await db.from("required_actions").update(raPayload).eq("user_id", userId); }
    else { await db.from("required_actions").insert({ user_id: userId, ...raPayload }); }

    return res.json({ success: true, url, transaction_id: String(transaction_id), token });
  } catch (err) {
    console.error("[Experian IDMN Start]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
