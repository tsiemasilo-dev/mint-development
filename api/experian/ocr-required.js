import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../_lib/supabase.js";

/* Decide whether a user should be shown the Experian OCR document scan (wf8).
   The scan was moved out of onboarding (onboarding = liveness only) and now fires
   at a later touchpoint — currently a secondary-strategy purchase (later also a
   withdrawal). This endpoint is the single source of truth for "does this user
   still need it?", so any trigger point can reuse it.

   required = true  ⇢ Experian liveness-only user, has an ID number, but we hold
                      no ID-document image yet → capture it now.
   required = false ⇢ we already have their ID document, OR they have no ID number
                      to run wf8 against (e.g. legacy Sumsub users — already
                      archived via Sumsub OCR, and nothing to feed wf8 anyway).

   Service-role only: the KYC archive (`sumsub_document_archive`) isn't readable
   by the client under RLS, so the whole decision is made here. */

// idDocType values (Sumsub + Experian) that count as "we have their ID document".
const ID_DOC_TYPES = new Set([
  "ID_CARD", "PASSPORT", "DRIVERS", "DRIVING_LICENCE",
  "RESIDENCE_PERMIT", "INTERNAL_PASSPORT",
]);
// Experian wf8 stores the captured document sides under these image_ids.
const ID_DOC_IMAGE_IDS = new Set(["id_front", "id_back"]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false });

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

    const identityNumber = raw?.identity_details?.identity_number || null;
    const ocrAlreadyDone = raw?.experian_ocr_status === "verified";

    // Do we already hold an ID-document image for this user (Experian OR Sumsub)?
    let hasIdDoc = false;
    try {
      const { data: docs } = await db
        .from("sumsub_document_archive")
        .select("image_id, resource_metadata")
        .eq("profile_id", userId);
      hasIdDoc = (docs || []).some((d) => {
        if (ID_DOC_IMAGE_IDS.has(d?.image_id)) return true;
        const t = d?.resource_metadata?.idDocDef?.idDocType;
        return t ? ID_DOC_TYPES.has(String(t).toUpperCase()) : false;
      });
    } catch { /* table/read issue → treat as no doc, but identity gate still applies */ }

    const required = Boolean(identityNumber) && !ocrAlreadyDone && !hasIdDoc;

    return res.json({
      success: true,
      required,
      reason: required
        ? "no_id_document_on_file"
        : !identityNumber ? "no_identity_number"
        : ocrAlreadyDone ? "ocr_already_completed"
        : "id_document_already_archived",
    });
  } catch (err) {
    console.error("[Experian OCR required]", err);
    // Never let this check block a purchase — fail open as "not required".
    return res.json({ success: true, required: false, reason: "check_error" });
  }
}
