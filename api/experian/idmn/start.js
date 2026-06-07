import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../../_lib/supabase.js";
import {
  EXPERIAN_IDMN_BASE,
  EXPERIAN_IDMN_WORKFLOW_ID,
  EXPERIAN_OCR_WORKFLOW_ID,
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

    // Two workflows share this endpoint:
    //   "liveness" (default) = Alternative Liveness (DHA face match + ID), step 1
    //   "ocr"                = OCR Liveness (ID-document capture + OCR), step 2
    // They use separate transaction keys so both can be in flight independently.
    const workflow = req.body?.workflow === "ocr" ? "ocr" : "liveness";
    const isOcr = workflow === "ocr";
    const K = isOcr
      ? { tx: "experian_ocr_transaction_id", token: "experian_ocr_token", started: "experian_ocr_started_at", result: "experian_ocr_result", mock: "experian_ocr_mock" }
      : { tx: "experian_idmn_transaction_id", token: "experian_idmn_token", started: "experian_idmn_started_at", result: "experian_idmn_result", mock: "experian_mock" };
    const workflowId = isOcr ? EXPERIAN_OCR_WORKFLOW_ID : EXPERIAN_IDMN_WORKFLOW_ID;

    const { data: onboarding } = await db
      .from("user_onboarding")
      .select("sumsub_raw, kyc_status, sumsub_applicant_id")
      .eq("user_id", userId)
      .maybeSingle();

    let raw = {};
    try { raw = typeof onboarding?.sumsub_raw === "string" ? JSON.parse(onboarding.sumsub_raw) : (onboarding?.sumsub_raw || {}); } catch {}

    // Liveness only: if already verified there's nothing new to start. But report
    // whether the OCR step is still outstanding so the client can route into it
    // instead of finishing onboarding. The OCR step itself runs AFTER kyc_status
    // is "verified", so it must never short-circuit here.
    if (!isOcr && (onboarding?.kyc_status === "verified" || onboarding?.kyc_status === "onboarding_complete")) {
      return res.json({
        success: true,
        alreadyVerified: true,
        status: onboarding.kyc_status,
        ocrComplete: raw?.experian_ocr_status === "verified",
      });
    }

    // "Redo" — caller wants a fresh workflow; drop the stored transaction so a
    // new StartWorkflow is issued below instead of resuming the old one.
    const restart = req.body?.restart === true;

    // Return existing URL if a workflow is already in flight (unless restarting)
    if (!restart && raw?.[K.tx] && raw?.[K.token]) {
      const url = `${EXPERIAN_IDMN_HOSTED_BASE}/${raw[K.token]}`;
      return res.json({ success: true, url, transaction_id: String(raw[K.tx]), token: raw[K.token], existing: true, workflow });
    }
    if (restart) {
      delete raw[K.tx];
      delete raw[K.token];
      delete raw[K.started];
      delete raw[K.result];
      delete raw[K.mock];
      // Clear any stale "under review" flag so a fresh attempt starts clean
      // (liveness only — OCR doesn't drive that flag).
      if (!isOcr) {
        await db.from("required_actions")
          .update({ kyc_pending: false, kyc_needs_resubmission: false })
          .eq("user_id", userId);
      }
    }

    const identityNumber = req.body?.identity_number || raw?.identity_details?.identity_number;
    if (!identityNumber) {
      return res.status(400).json({ success: false, error: { message: "Identity number not found. Please complete the ID number step first." } });
    }

    const MOCK = isMockMode();

    if (MOCK) {
      console.log(`[Experian IDMN] MOCK MODE — StartWorkflow (${workflow}) for user ${userId}`);
      const mockTxId = `mock-${workflow}-${Date.now()}`;
      const mockToken = `mock-token-${userId.slice(0, 8)}`;
      const updatedRaw = { ...raw, [K.tx]: mockTxId, [K.token]: mockToken, [K.started]: new Date().toISOString(), [K.mock]: true };
      const update = { sumsub_raw: updatedRaw, kyc_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      // Liveness only touches applicant_id / kyc_status ("started", not "pending").
      if (!isOcr) { update.sumsub_applicant_id = mockTxId; update.kyc_status = "started"; }
      await db.from("user_onboarding").update(update).eq("user_id", userId);
      return res.json({ success: true, mockMode: true, url: null, transaction_id: mockTxId, token: mockToken, workflow });
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
        workflow_id: workflowId,
      },
    };

    console.log(`[Experian IDMN] StartWorkflow (${workflow}, wf=${workflowId}) for user ${userId}`);
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
      [K.tx]: String(transaction_id),
      [K.token]: token,
      [K.started]: new Date().toISOString(),
    };

    // Liveness: status "started" (not "pending") + no kyc_pending flag — a link
    // was issued but nothing submitted yet, so the app must not show "Under Review".
    // OCR runs after verification, so it leaves kyc_status/applicant_id untouched.
    const update = { sumsub_raw: updatedRaw, kyc_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!isOcr) { update.sumsub_applicant_id = String(transaction_id); update.kyc_status = "started"; }
    await db.from("user_onboarding").update(update).eq("user_id", userId);

    return res.json({ success: true, url, transaction_id: String(transaction_id), token, workflow });
  } catch (err) {
    console.error("[Experian IDMN Start]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
