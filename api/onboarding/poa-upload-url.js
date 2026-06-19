import { supabaseAdmin, supabase } from "../_lib/supabase.js";

/**
 * POST /api/onboarding/poa-upload-url
 *
 * Issues a one-time signed upload URL for the caller's proof-of-address document
 * (bank statement / utility bill) in the PRIVATE "proof-of-address" bucket. The
 * client then uploads the file directly to storage with the returned token via
 * supabase.storage.from(bucket).uploadToSignedUrl(path, token, file).
 *
 * Why signed URL (not a base64 body): the file goes straight to storage, so it
 * sidesteps the serverless request-body size limit (phone photos are large), and
 * the bucket stays private with no per-user storage RLS policy — the service role
 * pre-authorises this single upload.
 *
 * Body:    { filename: string, contentType: string }
 * Returns: { success: true, bucket: "proof-of-address", path, token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });
    if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Storage not available" });

    // ── Validate ──────────────────────────────────────────────────────────
    const { filename, contentType } = req.body || {};
    const okType = /^application\/pdf$/i.test(contentType || "") || /^image\//i.test(contentType || "");
    if (!okType) {
      return res.status(400).json({ success: false, error: "Only PDF or image files are allowed" });
    }

    // ── Build a per-user path + signed upload URL ─────────────────────────
    const safeName = String(filename || "proof-of-address")
      .trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    const bucket = "proof-of-address";
    const path = `${user.id}/${Date.now()}-${safeName || "proof-of-address"}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("[poa-upload-url] createSignedUploadUrl error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[poa-upload-url] Issued upload URL for user ${user.id}: ${path}`);
    return res.status(200).json({ success: true, bucket, path, token: data.token });
  } catch (error) {
    console.error("[poa-upload-url] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
