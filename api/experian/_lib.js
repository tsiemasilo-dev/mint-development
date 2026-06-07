import https from "https";

export const EXPERIAN_IDMN_BASE =
  process.env.EXPERIAN_ENV === "production"
    ? "https://apis.experian.co.za:9443/IdMeNow"
    : "https://apis-uat.experian.co.za:9443/IdMeNow";

// UAT 10 = Alternative Liveness Verification (liveness + DHA face match + ID check, no AML)
// UAT 14 = Full ID Me Now (adds AML/PEP screening — billed extra, add back when ready)
// PROD equivalents: 6 = Alternative Liveness, 10 = Full ID Me Now
export const EXPERIAN_IDMN_WORKFLOW_ID =
  process.env.EXPERIAN_ENV === "production" ? 6 : 10;

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
      rejectUnauthorized: false, // UAT cert is self-signed; safe for non-prod
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

// Pull archivable assets out of an Experian CollectWorkflowResults payload.
// Each asset: { kind, idDocType, fileName, ext, mime, b64? , url? }
export function extractExperianAssets(collectResult) {
  const rd = collectResult?.return_data || {};
  const cb = rd?.response?.credit_bureau?.[0]?.response || {};
  const assets = [];
  if (rd.customer_image_base_64)
    assets.push({ kind: "selfie", idDocType: "SELFIE", b64: rd.customer_image_base_64, fileName: "liveness_selfie.png", ext: "png", mime: "image/png" });
  if (cb.facial_image)
    assets.push({ kind: "dha_portrait", idDocType: "DHA_PORTRAIT", b64: cb.facial_image, fileName: "dha_portrait.jpg", ext: "jpg", mime: "image/jpeg" });
  if (cb.pdf_report?.url_link)
    assets.push({ kind: "idv_report", idDocType: "IDV_REPORT", url: cb.pdf_report.url_link, fileName: "idv_report.pdf", ext: "pdf", mime: "application/pdf" });
  if (cb.response_doc)
    assets.push({ kind: "liveness_report", idDocType: "LIVENESS_REPORT", url: cb.response_doc, fileName: "rsa_id_liveness_report.pdf", ext: "pdf", mime: "application/pdf" });
  // OCR (workflow 8): when wired, push the captured ID-document image(s) here
  // (kind 'id_front'/'id_back', idDocType 'ID_CARD') and the OCR-extracted fields
  // ride along in resource_metadata via extractExperianIdentity().
  return assets;
}

// Normalised identity + scores from the result (also stored in resource_metadata).
export function extractExperianIdentity(collectResult) {
  const cb = collectResult?.return_data?.response?.credit_bureau?.[0]?.response || {};
  return {
    identity: {
      first_name: cb.first_name || null,
      last_name: cb.last_name || null,
      id_number: cb.id_number || null,
      id_issue_date: cb.id_issue_date || null,
      country: cb.birth_place_country || null,
    },
    scores: {
      liveness_pass: cb.liveness_result?.liveness_pass_result ?? null,
      face_match: cb.face_result?.is_identical ?? null,
      face_confidence: cb.face_result?.confidence ?? null,
    },
  };
}

// Remove the big base64 blobs before persisting the result in JSONB (images now
// live in storage; keep the rest of the record intact).
export function stripExperianImages(collectResult) {
  try {
    const c = JSON.parse(JSON.stringify(collectResult));
    if (c?.return_data) delete c.return_data.customer_image_base_64;
    const cb = c?.return_data?.response?.credit_bureau?.[0]?.response;
    if (cb) delete cb.facial_image;
    return c;
  } catch {
    return collectResult;
  }
}

// Archive every asset into KYC_ARCHIVE_BUCKET + sumsub_document_archive, matching
// the CRM's row shape. Idempotent (upsert on profile_id,image_id). Never throws —
// archiving must not break verification. Returns count archived.
export async function archiveExperianAssets(db, userId, collectResult, opts = {}) {
  const { transactionId, provider = "experian", reviewAnswer = null } = opts;
  const txid = String(transactionId || collectResult?.return_data?.transaction_id || Date.now());
  const { scores } = extractExperianIdentity(collectResult);
  let archived = 0;
  for (const a of extractExperianAssets(collectResult)) {
    try {
      let buf = null;
      if (a.b64) buf = b64ToBuffer(a.b64);
      else if (a.url) {
        const r = await fetch(a.url);
        if (!r.ok) { console.error(`[Experian archive] fetch ${a.kind} ${r.status}`); continue; }
        buf = Buffer.from(await r.arrayBuffer());
      }
      if (!buf || !buf.length) continue;

      const imageId = `${txid}-${a.kind}`;
      const storagePath = `${userId}/${provider}/${txid}/${imageId}-${a.fileName}`;
      const up = await db.storage.from(KYC_ARCHIVE_BUCKET).upload(storagePath, buf, { contentType: a.mime, upsert: true });
      if (up.error) { console.error(`[Experian archive] upload ${a.kind}: ${up.error.message}`); continue; }

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
        resource_metadata: { provider, kind: a.kind, idDocDef: { idDocType: a.idDocType }, source: "experian_idmn", scores },
        review_status: "completed",
        review_answer: reviewAnswer,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const ins = await db.from("sumsub_document_archive").upsert(row, { onConflict: "profile_id,image_id" });
      if (ins.error) { console.error(`[Experian archive] db ${a.kind}: ${ins.error.message}`); continue; }
      archived++;
    } catch (e) {
      console.error(`[Experian archive] ${a.kind}: ${e.message}`);
    }
  }
  return archived;
}
