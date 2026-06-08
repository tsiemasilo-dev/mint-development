import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../../_lib/supabase.js";
import {
  EXPERIAN_IDMN_BASE,
  experianRequest,
  experianBasicAuth,
  isMockMode,
  archiveExperianAssets,
  stripExperianImages,
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

    // "liveness" (default) = Alternative Liveness; "ocr" = OCR Liveness (step 2).
    const workflow = req.body?.workflow === "ocr" ? "ocr" : "liveness";
    const isOcr = workflow === "ocr";
    const K = isOcr
      ? { tx: "experian_ocr_transaction_id", token: "experian_ocr_token", result: "experian_ocr_result", status: "experian_ocr_status", collected: "experian_ocr_collected_at", mock: "experian_ocr_mock" }
      : { tx: "experian_idmn_transaction_id", token: "experian_idmn_token", result: "experian_idmn_result", status: "experian_idmn_status", collected: "experian_idmn_collected_at", mock: "experian_mock" };

    const transaction_id = raw?.[K.tx];
    const token = raw?.[K.token];
    if (!transaction_id || !token) {
      return res.status(400).json({ success: false, error: { message: "No pending verification found. Please start the verification first." } });
    }

    const MOCK = isMockMode() || raw?.[K.mock];

    if (MOCK) {
      console.log(`[Experian IDMN] MOCK MODE — CollectWorkflowResults (${workflow}) for user ${userId}`);
      const verifiedRaw = { ...raw, [K.status]: "verified", [K.collected]: new Date().toISOString(), [K.mock]: true };
      if (isOcr) {
        // OCR is a follow-on step — KYC is already verified, so just record it.
        await db.from("user_onboarding").update({ sumsub_raw: verifiedRaw, updated_at: new Date().toISOString() }).eq("user_id", userId);
        return res.json({ success: true, status: "verified", mockMode: true, workflow, message: "Mock OCR complete." });
      }
      await db.from("user_onboarding").update({ sumsub_raw: verifiedRaw, kyc_status: "onboarding_complete", kyc_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
      await db.from("required_actions").update({ kyc_verified: true, kyc_pending: false, kyc_needs_resubmission: false, kyc_verified_at: new Date().toISOString() }).eq("user_id", userId);
      const { data: packCheck } = await db.from("user_onboarding_pack_details").select("user_id").eq("user_id", userId).maybeSingle();
      if (!packCheck) { await db.from("user_onboarding_pack_details").insert({ user_id: userId, created_at: new Date().toISOString() }); }
      return res.json({ success: true, status: "verified", mockMode: true, workflow, message: "Mock verification complete." });
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
    // Default is "in_progress" — the user simply hasn't finished the workflow
    // yet (e.g. still typing their ID / taking the selfie). Alternative Liveness
    // is synchronous, so there is no real "under review" state: an unfinished
    // poll must NOT flag the account, or the whole app flips to "Under Review"
    // and the embedded panel gets torn down mid-flow.
    let kycStatus = "in_progress";
    let reviewAnswer = null;

    // The detailed verdicts live nested inside a Success envelope. A "Success"
    // response only means results were collected — the person can still FAIL
    // liveness or the DHA face match, so gate "verified" on those when present.
    const cbResp = collectResult?.return_data?.response?.credit_bureau?.[0]?.response;
    const livenessPass = cbResp?.liveness_result?.liveness_pass_result; // true | false | undefined
    const faceMatch = cbResp?.face_result?.is_identical;                // true | false | undefined

    if (collectResult?.response_status === "Success") {
      if (livenessPass === false || faceMatch === false) {
        // Collected successfully, but the biometric check did not pass.
        kycStatus = "not_verified"; reviewAnswer = "RED";
      } else {
        // Passed, or verdict fields absent (fall back to envelope success).
        kycStatus = "verified"; reviewAnswer = "GREEN";
      }
    } else if (errorCode === "IMN_202") {
      kycStatus = "in_progress"; // workflow not completed yet — keep polling
    } else if (errorCode === "IMN_205" || errorCode === "IMN_208") {
      kycStatus = "not_verified";
    } else if (collectResult?.response_status === "Failure") {
      kycStatus = "failed"; reviewAnswer = "RED";
    }

    // Only a CONFIRMED success ("verified") is allowed to mutate persistent
    // state. Every non-success outcome — including "failed"/"not_verified" — is
    // NOT written here: a freshly started or still-incomplete transaction (and
    // the 3rd-party-iframe 401 issue) can report failure-like results before the
    // user has even done anything. Auto-flagging the account "unsuccessful" in
    // that window is exactly the bug we're killing. Real failures are surfaced
    // in the UI on a manual status check, where the user can simply retry.
    if (kycStatus !== "verified") {
      const update = { kyc_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      // Dead/expired reference (IMN_205 "No records found" / IMN_208): the stored
      // transaction is unusable, so drop it. Otherwise start.js would keep
      // RESUMING this dead transaction (it returns the existing one when tx+token
      // are present) and every poll loops on IMN_205. Clearing the tx keys lets
      // the next start issue a fresh StartWorkflow. We still DON'T flag the
      // account failed — the no-mutation rule for kyc_status/required_actions holds.
      if (errorCode === "IMN_205" || errorCode === "IMN_208") {
        const cleared = { ...raw };
        delete cleared[K.tx];
        delete cleared[K.token];
        delete cleared[K.started];
        update.sumsub_raw = cleared;
        console.log(`[Experian IDMN] ${errorCode} for user ${userId} — cleared dead ${workflow} transaction so next start is fresh`);
      }
      await db.from("user_onboarding").update(update).eq("user_id", userId);
      // collectResult echoed back so the raw Experian payload is visible in the
      // browser console (helps inspect OCR/liveness fields without Vercel logs).
      return res.json({ success: true, status: kycStatus, errorCode: errorCode || null, workflow, collectResult });
    }

    // ── Verified — archive the documents, then persist a slimmed result ───────
    // Copy the workflow's assets (selfie/DHA portrait/PDFs; OCR document images
    // once wired) into our storage + the shared sumsub_document_archive table
    // (same shape the CRM reads) BEFORE storing the JSON, so the heavy base64
    // blobs can be stripped from what we keep in the DB.
    const archivedCount = await archiveExperianAssets(db, userId, collectResult, {
      transactionId: transaction_id,
      reviewAnswer,
      workflow,
    });
    const slimResult = stripExperianImages(collectResult);

    // OCR is a follow-on step that runs AFTER KYC is already verified — record
    // its result + archived docs, but don't re-touch kyc_status / required_actions.
    if (isOcr) {
      const ocrRaw = { ...raw, [K.result]: slimResult, [K.status]: "verified", [K.collected]: new Date().toISOString() };
      await db.from("user_onboarding").update({ sumsub_raw: ocrRaw, updated_at: new Date().toISOString() }).eq("user_id", userId);
      console.log(`[Experian OCR] user ${userId} verified — archived ${archivedCount} document(s)`);
      // Echo the FULL (un-slimmed) result here so the OCR structure — including the
      // ID-document image field we haven't mapped yet — is fully visible in the
      // browser console during testing. Storage still keeps the slimmed copy.
      return res.json({ success: true, status: kycStatus, workflow, archived: archivedCount, collectResult });
    }

    const updatedRaw = { ...raw, experian_idmn_result: slimResult, experian_idmn_collected_at: new Date().toISOString() };
    await db.from("user_onboarding").update({
      sumsub_raw: updatedRaw,
      sumsub_review_status: kycStatus,
      sumsub_review_answer: reviewAnswer,
      kyc_status: "verified",
      kyc_verified_at: new Date().toISOString(),
      kyc_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    const raPayload = { kyc_pending: false, kyc_verified: true, kyc_needs_resubmission: false };
    const { data: existingPack } = await db.from("user_onboarding_pack_details").select("user_id").eq("user_id", userId).maybeSingle();
    if (!existingPack) {
      await db.from("user_onboarding_pack_details").insert({
        user_id: userId,
        pack_details: { experian_idmn: slimResult, verified_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
    }

    const { data: existingAction } = await db.from("required_actions").select("id").eq("user_id", userId).maybeSingle();
    if (existingAction) { await db.from("required_actions").update(raPayload).eq("user_id", userId); }
    else { await db.from("required_actions").insert({ user_id: userId, ...raPayload }); }

    console.log(`[Experian IDMN] user ${userId} verified — archived ${archivedCount} document(s)`);
    return res.json({ success: true, status: kycStatus, errorCode: errorCode || null, workflow, archived: archivedCount, collectResult: slimResult });
  } catch (err) {
    console.error("[Experian IDMN Collect]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
