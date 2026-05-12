import { supabaseAdmin, supabase } from "../_lib/supabase.js";

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

    const {
      existing_onboarding_id,
      employment_status,
      employer_name,
      employer_industry,
      employment_type,
      institution_name,
      course_name,
      graduation_date,
      annual_income_amount,
      annual_income_currency,
    } = req.body || {};

    const userId = user.id;

    // ── Resolve existing onboarding record ────────────────────────────────
    let onboardingId = existing_onboarding_id || null;
    if (!onboardingId) {
      const { data: latest } = await db
        .from("user_onboarding")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) onboardingId = latest.id;
    }

    // ── Build upsert payload ──────────────────────────────────────────────
    const payload = {
      user_id: userId,
      employment_status: employment_status || "not_provided",
    };

    if (employer_name !== undefined) payload.employer_name = employer_name || null;
    if (employer_industry !== undefined) payload.employer_industry = employer_industry || null;
    if (employment_type !== undefined) payload.employment_type = employment_type || null;
    if (institution_name !== undefined) payload.institution_name = institution_name || null;
    if (course_name !== undefined) payload.course_name = course_name || null;
    if (graduation_date !== undefined) payload.graduation_date = graduation_date || null;
    if (annual_income_amount !== undefined) payload.annual_income_amount = annual_income_amount || null;
    if (annual_income_currency !== undefined) payload.annual_income_currency = annual_income_currency || "ZAR";

    let saved = false;

    // ── Try update first if we have an ID ─────────────────────────────────
    if (onboardingId) {
      const { data: updated, error: updateErr } = await db
        .from("user_onboarding")
        .update(payload)
        .eq("id", onboardingId)
        .eq("user_id", userId)
        .select("id");

      if (updateErr) {
        console.error("[save-employment] Update error:", updateErr.message);
      } else if (updated && updated.length > 0) {
        saved = true;
      }
    }

    // ── Fallback: insert new record ───────────────────────────────────────
    if (!saved) {
      const { data: inserted, error: insertErr } = await db
        .from("user_onboarding")
        .insert(payload)
        .select("id");

      if (insertErr) {
        console.error("[save-employment] Insert error:", insertErr.message);
        return res.status(500).json({ success: false, error: insertErr.message });
      }

      if (inserted?.[0]?.id) {
        onboardingId = inserted[0].id;
        saved = true;
      }
    }

    if (!saved) {
      return res.status(500).json({ success: false, error: "Failed to save employment details" });
    }

    console.log(`[save-employment] Saved for user ${userId}, onboarding_id: ${onboardingId}`);
    return res.json({ success: true, onboarding_id: onboardingId });
  } catch (error) {
    console.error("[save-employment] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
