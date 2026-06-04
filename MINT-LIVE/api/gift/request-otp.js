import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";
import { Resend } from "resend";

// In-memory store: userId → { code, expiresAt }
// Shared across requests in the same serverless instance; good enough for OTP use.
const otpStore = new Map();

export { otpStore };

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const db = supabaseAdmin || supabase;
  if (!db) return res.status(500).json({ error: "Database not available" });

  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: senderProfile } = await db.from("profiles").select("first_name, email").eq("id", user.id).maybeSingle();
  if (!senderProfile?.email) return res.status(400).json({ error: "No email address on your account." });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(user.id, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const firstName = senderProfile.first_name || "there";
  const resend = getResend();
  if (resend) {
    try {
      const otpTo = process.env.RESEND_FROM ? senderProfile.email : (process.env.RESEND_TEST_EMAIL || senderProfile.email);
      const otpResult = await resend.emails.send({
        from: process.env.RESEND_FROM || "Mint <onboarding@resend.dev>",
        to: [otpTo],
        subject: `Your Mint gift verification code: ${code}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px">Gift verification</h2>
          <p style="color:#475569;font-size:15px;margin-bottom:24px">Hi ${firstName}, use the code below to confirm your investment gift. It expires in 10 minutes.</p>
          <div style="background:#f1f5f9;border-radius:16px;padding:24px 32px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#7c3aed">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
      });
      if (otpResult?.error) {
        console.warn("[gift/request-otp] Email delivery failed:", otpResult.error.message);
        console.log(`\n[DEV] OTP code for ${senderProfile.email}: ${code}\n`);
      }
    } catch (e) {
      console.warn("[gift/request-otp] email exception:", e.message);
      console.log(`\n[DEV] OTP code for ${senderProfile.email}: ${code}\n`);
    }
  } else {
    console.log(`\n[DEV] OTP code for ${senderProfile.email}: ${code}\n`);
  }

  res.json({ success: true });
}
