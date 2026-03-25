import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { data, error } = await db
      .from("user_onboarding")
      .select("sumsub_raw")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Onboarding] Mandate load error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    let mandateData = null;
    if (data?.sumsub_raw) {
      try {
        const parsed = typeof data.sumsub_raw === "string" 
          ? JSON.parse(data.sumsub_raw) 
          : data.sumsub_raw;
        mandateData = parsed?.mandate_data || null;
      } catch (e) {
        mandateData = null;
      }
    }

    res.json({ success: true, mandate_data: mandateData });
  } catch (error) {
    console.error("[Onboarding] Mandate load error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
