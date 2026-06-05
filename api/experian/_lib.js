import https from "https";

export const EXPERIAN_IDMN_BASE =
  process.env.EXPERIAN_ENV === "production"
    ? "https://apis.experian.co.za:9443/IdMeNow"
    : "https://apis-uat.experian.co.za:9443/IdMeNow";

export const EXPERIAN_IDMN_WORKFLOW_ID =
  process.env.EXPERIAN_ENV === "production" ? 10 : 14;

export const EXPERIAN_IDMN_HOSTED_BASE =
  process.env.EXPERIAN_ENV === "production"
    ? "https://experian.tgpdc.com/anonymous_workflow"
    : "https://experian.uat.tgpdc.com/anonymous_workflow";

/* POST to Experian over HTTPS with a custom agent that tolerates
   self-signed certs on UAT. Resolves with { status, data }. */
export function experianRequest(url, bodyObj, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(bodyObj);
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
