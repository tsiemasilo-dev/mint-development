import { supabaseAdmin } from "../_lib/supabase.js";
import { truIDClient } from "../_lib/truidClient.js";
import { getSumsubApplicantByExternalId } from "../_lib/sumsub.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: { message: "Missing or invalid Authorization header" } });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: { message: "Database not configured" } });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, id_number")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ success: false, error: { message: "Database error looking up profile" } });
    }

    // Resilience: Fallback to metadata if profile record is missing or incomplete
    let firstName = profile?.first_name || user.user_metadata?.first_name || "";
    let lastName = profile?.last_name || user.user_metadata?.last_name || "";
    let idNumber = profile?.id_number || "";

    if (!idNumber) {
      try {
        const applicant = await getSumsubApplicantByExternalId(user.id);
        if (applicant?.info?.idDocs?.length) {
          const idDoc = applicant.info.idDocs.find(d => d.number) || {};
          idNumber = idDoc.number || null;
        }
        if (!idNumber && applicant?.fixedInfo?.idDocs?.length) {
          const idDoc = applicant.fixedInfo.idDocs.find(d => d.number) || {};
          idNumber = idDoc.number || null;
        }
        if (idNumber) {
          // Sync profile if it exists, otherwise create it
          if (profile) {
            await supabaseAdmin.from("profiles").update({ id_number: idNumber }).eq("id", user.id);
          } else {
            await supabaseAdmin.from("profiles").insert({
              id: user.id,
              first_name: firstName,
              last_name: lastName,
              id_number: idNumber
            });
          }
        }
      } catch (sumsubErr) {
        console.warn("Could not fetch ID from Sumsub:", sumsubErr.message);
      }
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    if (!fullName || !idNumber) {
      return res.status(400).json({
        success: false,
        error: { message: "Profile is missing name or ID number. Please complete your profile first." }
      });
    }

    const collection = await truIDClient.createCollection({
      name: fullName,
      idNumber: idNumber,
      email: user.email,
      force: true // Force fresh consent to bypass stale server-side sessions
    });

    return res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl
    });
  } catch (error) {
    console.error("Banking initiate error COMPLETE:", error);
    return res.status(error.status || 500).json({
      success: false,
      error: { 
        message: error.message || "Internal server error",
        status: error.status,
        details: error.data || error.response?.data
      }
    });
  }
}
