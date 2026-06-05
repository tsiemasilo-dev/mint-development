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
