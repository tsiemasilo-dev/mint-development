import { supabaseAdmin, supabase as supabaseAnon, authenticateUser } from "../_lib/supabase.js";
import { EXPERIAN_KYC_URL, experianKycAuth, experianRequest, archiveKycSnapshot } from "./_lib.js";

const TYPE_LABEL = { R: "Residential address", W: "Work address", P: "Postal address", O: "Other address" };

const digits = (s) => String(s ?? "").replace(/[^\d]/g, "");

// Normalise a SA phone number to +27… so the mandate can derive the country code.
function normPhoneSA(raw) {
  const d = digits(raw);
  if (!d) return "";
  if (d.length === 10 && d.startsWith("0")) return "+27" + d.slice(1);
  if (d.length === 11 && d.startsWith("27")) return "+" + d;
  if (d.length === 9) return "+27" + d; // assume a SA number missing its leading 0
  return String(raw).trim().startsWith("+") ? String(raw).trim() : "+" + d;
}

// Pull phone numbers + email out of the bureau contact block. The exact shape
// isn't documented, so walk it recursively and classify by key-name hints —
// tolerant of arrays, nested objects, and XML- vs REST-cased keys.
function normContact(rd) {
  const cd = rd?.contact_data ?? rd?.ContactData ?? rd?.contact ?? rd?.Contact ?? null;
  const phones = [];
  let email = "";
  const consider = (key, val) => {
    const v = String(val ?? "").trim();
    if (!v) return;
    if (/@/.test(v)) { if (!email) email = v; return; }
    const d = digits(v);
    if (d.length >= 9 && d.length <= 13) {
      const k = String(key || "").toLowerCase();
      const type = /cell|mobile|msisdn/.test(k) ? "cell" : /work|bus|employ/.test(k) ? "work" : /home|res|tel|phone/.test(k) ? "home" : "other";
      phones.push({ type, value: normPhoneSA(v) });
    }
  };
  const walk = (node, key) => {
    if (node == null) return;
    if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
    if (typeof node === "object") return Object.entries(node).forEach(([k, v]) => walk(v, k));
    consider(key, node);
  };
  walk(cd, "");
  const cell = phones.find((p) => p.type === "cell") || phones.find((p) => p.type === "home") || phones[0] || null;
  return { cell: cell?.value || "", email, phones };
}

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
    typeLabel: TYPE_LABEL[type] || get("address_type_description", "AddressTypeDescription") || "Address",
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
        contact: { cell: "+27821234567", email: "", phones: [{ type: "cell", value: "+27821234567" }] },
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
        want_contact: "Y",
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

    // Residential first, then most-recently-updated; cap at 10.
    const addresses = (Array.isArray(rawAddrs) ? rawAddrs : [])
      .map(normAddress)
      .filter((a) => a.formatted)
      .sort((a, b) => {
        if ((a.type === "R") !== (b.type === "R")) return a.type === "R" ? -1 : 1;
        return String(b.lastUpdated || "").localeCompare(String(a.lastUpdated || ""));
      })
      .slice(0, 10);

    // Bureau identity fields, if the response carries them.
    const identity = {
      first_name: rd?.first_name || rd?.forename || null,
      last_name: rd?.last_name || rd?.surname || null,
      id_number: identityNumber,
    };

    // Bureau contact (phone/email). Shape is undocumented — parsed tolerantly.
    const contact = normContact(rd);
    console.log(`[Experian KYC] contact → cell=${contact.cell ? contact.cell.slice(0, 6) + "…" : "none"} · email=${contact.email ? "yes" : "no"} · phones=${contact.phones.length}`);

    // Persist once: durable archive snapshot (never lose it, CRM-visible) +
    // audit copy in sumsub_raw. Both update in place on re-checks.
    await archiveKycSnapshot(db, userId, { enquiry_id: rd?.enquiry_id, stats, addresses, identity, contact, checked_at: new Date().toISOString() });
    const checkedAt = new Date().toISOString();
    const updatedRaw = { ...raw, experian_kyc_addresses: addresses, experian_kyc_contact: contact, experian_kyc_stats: stats, experian_kyc_checked_at: checkedAt };
    await db.from("user_onboarding").update({ sumsub_raw: updatedRaw, updated_at: checkedAt }).eq("user_id", userId);

    if (addresses.length === 0) {
      const note =
        kycResult?.error_description ||
        kycResult?.ErrorDescription ||
        (stats.person_found === "Y"
          ? "No addresses are held by the bureau for this ID."
          : status === "Failure"
          ? "Bureau lookup failed."
          : "No address data returned.");
      console.log(`[Experian KYC] No addresses for user ${userId} → manual entry. note="${note}"`);
      return res.json({ success: true, addresses: [], contact, note, personFound: stats.person_found === "Y" });
    }

    console.log(`[Experian KYC] Returning ${addresses.length} address(es) for user ${userId}`);
    return res.json({ success: true, addresses, contact });
  } catch (err) {
    console.error("[Experian KYC addresses]", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}
