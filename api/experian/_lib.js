import https from "https";

export const EXPERIAN_IDMN_BASE =
  process.env.EXPERIAN_ENV === "production"
    ? "https://apis.experian.co.za:9443/IdMeNow"
    : "https://apis-uat.experian.co.za:9443/IdMeNow";

// KYC V2 bureau service (separate from IDMN). Returns bureau Address/Contact/
// Employment data by ID number. Auth goes in the request BODY (not a Basic
// header). Same Experian account/branch — reuses the IDMN creds when dedicated
// KYC creds aren't set.
export const EXPERIAN_KYC_URL =
  process.env.EXPERIAN_ENV === "production"
    ? "https://apis.experian.co.za:9443/KycService/RequestNewKYC"
    : "https://apis-uat.experian.co.za:9443/KycService/RequestNewKYC";

export function experianKycAuth() {
  // IDMN creds are the primary login for the KYC address lookup (validated working);
  // EXPERIAN_KYC_* kept as an optional override if a dedicated KYC login is ever set.
  return {
    username: process.env.EXPERIAN_IDMN_USERNAME || process.env.EXPERIAN_KYC_USERNAME || "",
    password: process.env.EXPERIAN_IDMN_PASSWORD || process.env.EXPERIAN_KYC_PASSWORD || "",
    version: "1.0",
    origin: "MINT",
  };
}

// UAT 10 = Alternative Liveness Verification (liveness + DHA face match + ID check, no AML)
// UAT 14 = Full ID Me Now (adds AML/PEP screening — billed extra, add back when ready)
// PROD equivalents: 6 = Alternative Liveness, 10 = Full ID Me Now
export const EXPERIAN_IDMN_WORKFLOW_ID =
  process.env.EXPERIAN_ENV === "production" ? 6 : 10;

// OCR Liveness Verification (liveness + ID-document OCR + selfie↔document match).
// UAT 12 / PROD 8 (per Experian spec). Runs as a SECOND workflow to capture the
// ID document image + OCR fields.
//
// ⚠️ If Experian's hosted OCR page errors ("An error occurred while processing
// your request") + CollectWorkflowResults returns IMN_205 in PRODUCTION, the
// production OCR workflow number is likely different from 8 / not enabled for the
// account. Once Experian confirms the correct PROD number, set it here and
// redeploy — no Vercel env access needed. null = use env/spec default below.
const OCR_WORKFLOW_PROD_OVERRIDE = null; // e.g. 8

export const EXPERIAN_OCR_WORKFLOW_ID =
  Number(process.env.EXPERIAN_OCR_WORKFLOW_ID) ||
  (process.env.EXPERIAN_ENV === "production"
    ? (OCR_WORKFLOW_PROD_OVERRIDE || 8)
    : 12);

export const EXPERIAN_IDMN_HOSTED_BASE =
  process.env.EXPERIAN_ENV === "production"
    ? "https://experian.tgpdc.com/anonymous_workflow"
    : "https://experian.uat.tgpdc.com/anonymous_workflow";

/* POST to Experian over HTTPS with a custom agent that tolerates
   self-signed certs on UAT. Resolves with { status, data }. */
export function experianRequest(url, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    // Accept a pre-serialized JSON string so callers can preserve the precision
    // of large integers (e.g. the 20-digit transaction_id) that JSON.stringify
    // of a JS Number would corrupt past Number.MAX_SAFE_INTEGER.
    const postData = typeof body === "string" ? body : JSON.stringify(body);
    const options = {
      hostname: parsedUrl.hostname,
      port: Number(parsedUrl.port) || 443,
      path: parsedUrl.pathname + (parsedUrl.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...extraHeaders,
      },
      // Only disable TLS verification in non-production (UAT certs are self-signed)
      rejectUnauthorized: process.env.EXPERIAN_ENV === 'production' || process.env.NODE_ENV === 'production',
    };
    const req = https.request(options, (resp) => {
      let raw = "";
      resp.on("data", (chunk) => { raw += chunk; });
      resp.on("end", () => {
        try { resolve({ status: resp.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: resp.statusCode, data: { raw } }); }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

export function experianBasicAuth() {
  const u = process.env.EXPERIAN_IDMN_USERNAME || "";
  const p = process.env.EXPERIAN_IDMN_PASSWORD || "";
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

export function isMockMode() {
  return (
    process.env.EXPERIAN_MOCK_MODE === "true" ||
    !process.env.EXPERIAN_IDMN_USERNAME ||
    !process.env.EXPERIAN_IDMN_PASSWORD
  );
}

/* ───────────────────────── KYC archive (provider-agnostic) ───────────────────
   Experian verification assets are written into the SAME storage bucket + table
   the CRM already reads for Sumsub (`sumsub-archive` / public.sumsub_document_archive),
   so the CRM renders Experian users identically with no changes. Designed to be
   OCR-ready: extractExperianAssets() is the one place to extend when the OCR
   (workflow 8) document images + OCR fields are added. */
export const KYC_ARCHIVE_BUCKET = "sumsub-archive";

function b64ToBuffer(s) {
  return Buffer.from(String(s).replace(/^data:[^,]+,/, ""), "base64");
}

function creditBureauServices(collectResult) {
  const cb = collectResult?.return_data?.response?.credit_bureau;
  return Array.isArray(cb) ? cb : [];
}

// Pull archivable assets out of an Experian CollectWorkflowResults payload —
// across ALL credit_bureau services, so both Alternative Liveness (wf6) and OCR
// Liveness (wf8) are handled. Each asset: { kind, idDocType, fileName, ext, mime, b64?, url? }
export function extractExperianAssets(collectResult) {
  const rd = collectResult?.return_data || {};
  // Selfie lives at return_data.response, NOT return_data directly.
  // return_data.response also holds credit_bureau[]; the top-level return_data
  // only has transaction_id / status / status_msg.
  const rdResp = rd.response || {};
  const assets = [];

  // Liveness selfie (wf6): prefer inline base64; fall back to expiring S3 URL.
  if (rdResp.customer_image_base_64)
    assets.push({ kind: "selfie", idDocType: "SELFIE", b64: rdResp.customer_image_base_64, fileName: "liveness_selfie.png", ext: "png", mime: "image/png" });
  else if (rdResp.customer_image)
    assets.push({ kind: "selfie", idDocType: "SELFIE", url: rdResp.customer_image, fileName: "liveness_selfie.jpg", ext: "jpg", mime: "image/jpeg" });

  for (const svc of creditBureauServices(collectResult)) {
    const r = svc?.response || {};
    // ── Alternative Liveness (wf6) ──
    if (r.facial_image)
      assets.push({ kind: "dha_portrait", idDocType: "DHA_PORTRAIT", b64: r.facial_image, fileName: "dha_portrait.jpg", ext: "jpg", mime: "image/jpeg" });
    if (r.pdf_report?.url_link)
      assets.push({ kind: "idv_report", idDocType: "IDV_REPORT", url: r.pdf_report.url_link, fileName: "idv_report.pdf", ext: "pdf", mime: "application/pdf" });
    if (r.response_doc)
      assets.push({ kind: "liveness_report", idDocType: "LIVENESS_REPORT", url: r.response_doc, fileName: "rsa_id_liveness_report.pdf", ext: "pdf", mime: "application/pdf" });
    // ── OCR Liveness (wf8): captured ID document images (base64 JPEG) ──
    const di = r.document_images;
    if (di) {
      if (di.document_front_side) assets.push({ kind: "id_front", idDocType: "ID_CARD", b64: di.document_front_side, fileName: "id_front.jpg", ext: "jpg", mime: "image/jpeg" });
      if (di.document_back_side)  assets.push({ kind: "id_back",  idDocType: "ID_CARD", b64: di.document_back_side,  fileName: "id_back.jpg",  ext: "jpg", mime: "image/jpeg" });
      if (di.portrait)            assets.push({ kind: "id_portrait", idDocType: "ID_PORTRAIT", b64: di.portrait, fileName: "id_portrait.jpg", ext: "jpg", mime: "image/jpeg" });
      if (di.signature)           assets.push({ kind: "signature", idDocType: "SIGNATURE", b64: di.signature, fileName: "signature.jpg", ext: "jpg", mime: "image/jpeg" });
    }
  }
  return assets;
}

// Normalised identity + scores, merged across services (wf6 DHA fields + wf8 OCR
// document_details). Stored in resource_metadata for the CRM/app to read.
export function extractExperianIdentity(collectResult) {
  const identity = {};
  const scores = {};
  const set = (k, v) => { if (identity[k] == null && v != null) identity[k] = v; };

  for (const svc of creditBureauServices(collectResult)) {
    const r = svc?.response || {};
    // Alternative Liveness (wf6)
    set("first_name", r.first_name);
    set("last_name", r.last_name);
    set("id_number", r.id_number);
    set("id_issue_date", r.id_issue_date);
    set("country", r.birth_place_country);
    if (r.liveness_result?.liveness_pass_result != null) scores.liveness_pass = r.liveness_result.liveness_pass_result;
    if (r.face_result?.is_identical != null) scores.face_match = r.face_result.is_identical;
    if (r.face_result?.confidence != null) scores.face_confidence = r.face_result.confidence;
    // OCR document_details (wf8)
    const dd = r.document_details;
    if (dd) {
      set("first_name", dd.given_names);
      set("last_name", dd.surname);
      set("id_number", dd.personal_number);
      set("dob", dd.date_of_birth);
      set("sex", dd.sex);
      set("citizenship_status", dd.citizenship_status);
      set("nationality", dd.nationality);
    }
  }
  return { identity, scores };
}

// Remove the big base64 blobs before persisting the result in JSONB (images now
// live in storage; keep the rest of the record intact).
export function stripExperianImages(collectResult) {
  try {
    const c = JSON.parse(JSON.stringify(collectResult));
    // Selfie lives at return_data.response, not return_data directly
    if (c?.return_data?.response) delete c.return_data.response.customer_image_base_64;
    const services = c?.return_data?.response?.credit_bureau;
    if (Array.isArray(services)) {
      for (const svc of services) {
        const r = svc?.response;
        if (r) { delete r.facial_image; delete r.document_images; }
      }
    }
    return c;
  } catch {
    return collectResult;
  }
}

// Archive every asset into KYC_ARCHIVE_BUCKET + sumsub_document_archive, matching
// the CRM's row shape. Idempotent (upsert on profile_id,image_id). Never throws —
// archiving must not break verification. Returns count archived.
export async function archiveExperianAssets(db, userId, collectResult, opts = {}) {
  const { transactionId, provider = "experian", reviewAnswer = null, workflow = "liveness" } = opts;
  const txid = String(transactionId || collectResult?.return_data?.transaction_id || Date.now());
  const { scores } = extractExperianIdentity(collectResult);
  const assets = extractExperianAssets(collectResult);
  const kindsFound = assets.map((a) => a.kind);
  console.log(
    `[Experian archive] user ${userId}: ${kindsFound.length} asset(s) [${kindsFound.join(", ")}]` +
      (kindsFound.includes("selfie") ? "" : " — NO live selfie in this payload")
  );
  const result = { archived: 0, found: kindsFound, kinds: [], failed: [] };
  for (const a of assets) {
    try {
      let buf = null;
      if (a.b64) buf = b64ToBuffer(a.b64);
      else if (a.url) {
        const r = await fetch(a.url);
        if (!r.ok) { const e = `fetch ${r.status}`; console.error(`[Experian archive] ${a.kind} ${e}`); result.failed.push({ kind: a.kind, error: e }); continue; }
        buf = Buffer.from(await r.arrayBuffer());
      }
      if (!buf || !buf.length) { console.error(`[Experian archive] ${a.kind}: empty buffer`); result.failed.push({ kind: a.kind, error: "empty buffer" }); continue; }

      // Stable per-asset id/path (no transaction id) so re-running verification
      // UPDATES the same row/object instead of piling up a fresh set every time.
      const imageId = a.kind;
      const storagePath = `${userId}/${provider}/${imageId}-${a.fileName}`;
      const up = await db.storage.from(KYC_ARCHIVE_BUCKET).upload(storagePath, buf, { contentType: a.mime, upsert: true });
      if (up.error) { console.error(`[Experian archive] upload ${a.kind}: ${up.error.message}`); result.failed.push({ kind: a.kind, error: `upload: ${up.error.message}` }); continue; }

      const row = {
        profile_id: userId,
        external_user_id: userId,
        applicant_id: txid,
        inspection_id: txid,
        image_id: imageId,
        file_name: a.fileName,
        file_type: a.ext,
        mime_type: a.mime,
        content_size_bytes: buf.length,
        storage_bucket: KYC_ARCHIVE_BUCKET,
        storage_path: storagePath,
        resource_metadata: { provider, workflow, kind: a.kind, idDocDef: { idDocType: a.idDocType }, source: "experian_idmn", scores },
        review_status: "completed",
        review_answer: reviewAnswer,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const ins = await db.from("sumsub_document_archive").upsert(row, { onConflict: "profile_id,image_id" });
      if (ins.error) { console.error(`[Experian archive] db ${a.kind}: ${ins.error.message}`); result.failed.push({ kind: a.kind, error: `db: ${ins.error.message}` }); continue; }
      result.archived++;
      result.kinds.push(a.kind);
    } catch (e) {
      console.error(`[Experian archive] ${a.kind}: ${e.message}`);
      result.failed.push({ kind: a.kind, error: e.message });
    }
  }
  console.log(`[Experian archive] user ${userId}: archived ${result.archived} [${result.kinds.join(", ")}]` + (result.failed.length ? ` | FAILED: ${result.failed.map((f) => `${f.kind}(${f.error})`).join(", ")}` : ""));
  return result;
}

// Persist a KYC V2 bureau result (addresses + stats + any identity) into the
// SAME archive table the CRM reads, as one JSON "document" per user. Stable
// image_id ("kyc_bureau") → re-checks UPDATE in place. The address list/stats
// also go in resource_metadata so the CRM can show them without a download.
// Never throws. Returns true on success.
export async function archiveKycSnapshot(db, userId, snapshot, provider = "experian") {
  try {
    const buf = Buffer.from(JSON.stringify(snapshot, null, 2));
    const imageId = "kyc_bureau";
    const fileName = "experian_kyc_bureau.json";
    const storagePath = `${userId}/${provider}/${imageId}-${fileName}`;
    const up = await db.storage.from(KYC_ARCHIVE_BUCKET).upload(storagePath, buf, { contentType: "application/json", upsert: true });
    if (up.error) { console.error(`[Experian KYC archive] upload: ${up.error.message}`); return false; }

    const row = {
      profile_id: userId,
      external_user_id: userId,
      applicant_id: String(snapshot?.enquiry_id || Date.now()),
      inspection_id: String(snapshot?.enquiry_id || ""),
      image_id: imageId,
      file_name: fileName,
      file_type: "json",
      mime_type: "application/json",
      content_size_bytes: buf.length,
      storage_bucket: KYC_ARCHIVE_BUCKET,
      storage_path: storagePath,
      resource_metadata: {
        provider,
        workflow: "kyc_v2",
        kind: "kyc_bureau",
        idDocDef: { idDocType: "KYC_BUREAU" },
        source: "experian_kyc",
        addresses: snapshot?.addresses || [],
        stats: snapshot?.stats || {},
        identity: snapshot?.identity || {},
      },
      review_status: "completed",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ins = await db.from("sumsub_document_archive").upsert(row, { onConflict: "profile_id,image_id" });
    if (ins.error) { console.error(`[Experian KYC archive] db: ${ins.error.message}`); return false; }
    console.log(`[Experian KYC archive] user ${userId}: snapshot stored (${(snapshot?.addresses || []).length} address(es))`);
    return true;
  } catch (e) {
    console.error(`[Experian KYC archive] ${e.message}`);
    return false;
  }
}
