import { supabaseAdmin, supabase } from "../_lib/supabase.js";

/**
 * POST /api/credit/statement-upload-url
 *
 * Issues a one-time signed upload URL for the caller's bank statement (income
 * verification, credit flow) in the PRIVATE "income-statements" bucket. The
 * client uploads directly to storage via
 * supabase.storage.from(bucket).uploadToSignedUrl(path, token, file).
 *
 * PDF only — Gemini reads PDFs natively (no separate OCR/parsing step needed),
 * and most banks export statements as PDF anyway.
 *
 * Body:    { filename: string }
 * Returns: { success: true, bucket: "income-statements", path, token }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });
    if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Storage not available" });

    const { filename } = req.body || {};
    const safeName = String(filename || "bank-statement")
      .trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    if (!/\.pdf$/i.test(safeName)) {
      return res.status(400).json({ success: false, error: "Only PDF files are accepted" });
    }

    const bucket = "income-statements";
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("[statement-upload-url] createSignedUploadUrl error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, bucket, path, token: data.token });
  } catch (error) {
    console.error("[statement-upload-url] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
