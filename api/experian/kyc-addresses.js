import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../_lib/supabase.js";
import { EXPERIAN_KYC_URL, experianKycAuth, experianRequest } from "./_lib.js";

const TYPE_LABEL = { R: "Residential", W: "Work", P: "Postal", O: "Other" };

// Normalise one address record (REST JSON is lowercase; tolerate XML-cased keys too).
function normAddress(a) {
  const get = (lc, uc) => a[lc] ?? a[uc] ?? "";
  const lines = [get("line_1", "Line1"), get("line_2", "Line2"), get("line_3", "Line3"), get("line_4", "Line4")]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const postal = String(get("postal_code", "PostalCode") || "").trim();
  const type = String(get("address_type", "AddressType") || "").trim().toUpperCase();
  const formatted = [lines.join(", "), postal].filter(Boolean).join(", ");
  return {
    formatted,
    type,
    typeLabel: get("address_type_description", "AddressTypeDescription") || TYPE_LABEL[type] || "Address",
    postalCode: postal,
    lastUpdated: get("last_date_updated", "LastDateUpdated") || null,
    lines,
  };
}

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

    const identityNumber =
      req.body?.identity_number ||
      raw?.identity_details?.identity_number ||
      null;
    if (!identityNumber) {
      return res.status(400).json({ success: false, error: { message: "Identity number not found. Complete the ID number step first." } });
    }

    const { data: profile } = await db.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();

    const kycAuth = experianKycAuth();

    // Mock mode (KYC creds not configured): return sample addresses so the flow works in dev.
    if (!kycAuth.username || !kycAuth.password) {
      return res.json({
        success: true,
        mockMode: true,
        addresses: [
          { formatted: "12 Loop Street, Cape Town City Centre, 8001", type: "R", typeLabel: "Residential", postalCode: "8001", lastUpdated: "2024-01-01", lines: ["12 Loop Street", "Cape Town City Centre"] },
          { formatted: "47 Rivonia Road, Sandton, 2196", type: "R", typeLabel: "Residential", postalCode: "2196", lastUpdated: "2022-06-01", lines: ["47 Rivonia Road", "Sandton"] },
        ],
      });
    }

    const kycBody = {
      auth: kycAuth,
      search_criteria: {
        identity_number: identityNumber,
        identity_type: "SID",
        forename: profile?.first_name || req.body?.forename || "",
        surname: profile?.last_name || req.body?.surname || "",
        want_search_criteria: "Y",
        want_addresses: "Y",
        want_contact: "N",
        want_employment: "N",
        want_safps: "N",
      },
    };

    console.log(`[Experian KYC] Address lookup for user ${userId} (id ${String(identityNumber).slice(0, 6)}…)`);
    const { status: httpStatus, data: kycResult } = await experianRequest(EXPERIAN_KYC_URL, kycBody);

    const rd = kycResult?.return_data || kycResult?.ReturnData || kycResult?.BureauResponse?.return_data || kycResult?.BureauResponse?.ReturnData || {};
    const rawAddrs = rd?.address_data || rd?.AddressData || [];
    const status = kycResult?.response_status || kycResult?.ResponseStatus || kycResult?.BureauResponse?.ResponseStatus;
    const stats = rd?.stats || {};
    console.log(
      `[Experian KYC] HTTP ${httpStatus} · status=${status} · person_found=${stats.person_found ?? "?"} · address_count=${stats.address_count ?? (Array.isArray(rawAddrs) ? rawAddrs.length : 0)} · error=${kycResult?.error_code || "none"}`
    );

    if (!Array.isArray(rawAddrs) || rawAddrs.length === 0) {
      const note =
        kycResult?.error_description ||
        kycResult?.ErrorDescription ||
        (stats.person_found === "Y"
          ? "No addresses are held by the bureau for this ID."
          : status === "Failure"
          ? "Bureau lookup failed."
          : "No address data returned.");
      console.log(`[Experian KYC] No addresses for user ${userId} → manual entry. note="${note}"`);
      return res.json({ success: true, addresses: [], note, personFound: stats.person_found === "Y" });
    }

    // Residential first, then most-recently-updated; cap at 10.
    const addresses = rawAddrs
      .map(normAddress)
      .filter((a) => a.formatted)
      .sort((a, b) => {
        if ((a.type === "R") !== (b.type === "R")) return a.type === "R" ? -1 : 1;
        return String(b.lastUpdated || "").localeCompare(String(a.lastUpdated || ""));
      })
      .slice(0, 10);

    // Stash for audit / reuse (no PII beyond what's already on file).
    const updatedRaw = { ...raw, experian_kyc_addresses: addresses, experian_kyc_checked_at: new Date().toISOString() };
    await db.from("user_onboarding").update({ sumsub_raw: updatedRaw, updated_at: new Date().toISOString() }).eq("user_id", userId);

    console.log(`[Experian KYC] Returning ${addresses.length} address(es) for user ${userId}`);
    return res.json({ success: true, addresses });
  } catch (err) {
    console.error("[Experian KYC addresses]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
