import { GoogleGenAI, Type } from "@google/genai";
import { supabaseAdmin, supabase, authenticateUser } from "../_lib/supabase.js";

/**
 * POST /api/credit/detect-income
 *
 * Gemini-powered salary detection for the credit-flow income step. Reads a
 * bank statement PDF the client already uploaded to the private
 * "income-statements" bucket (via /api/credit/statement-upload-url), and asks
 * Gemini to find every salary-looking credit in it, then returns a structured
 * result for the user to confirm (or correct) before it's saved as
 * credit_monthly_income.
 *
 * This endpoint does NOT persist anything — detection is a draft the user
 * confirms client-side, exactly like the manual-entry path already did.
 *
 * Body: { path: string, months?: 3|6 }
 */

const PER_TRANSACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    salary_date: {
      type: Type.STRING,
      description:
        "The date the salary was credited/deposited, strictly formatted as YYYY-MM-DD. " +
        "Look for transaction dates aligned with end-of-month or mid-month pay cycles. If missing, return null.",
    },
    salary_amount: {
      type: Type.NUMBER,
      description:
        "The net take-home amount actually deposited for this transaction, in the statement's currency. " +
        "Strip currency symbols, spaces, and thousands separators (e.g. 'R 15,000.00' -> 15000.00). If missing, return null.",
    },
    gross_amount: {
      type: Type.NUMBER,
      description: "Gross salary before deductions, ONLY if explicitly stated on the statement. Do not infer. If missing, return null.",
    },
    transaction_reference: {
      type: Type.STRING,
      description: "The raw reference/narration exactly as it appears (e.g. 'SAL/EMP001/JUN2026', 'PAYROLL ADP 00123'). If missing, return null.",
    },
    employer_name: {
      type: Type.STRING,
      description: "Employer or payroll sender name as it appears in the description. If missing, return null.",
    },
    payroll_processor: {
      type: Type.STRING,
      description: "Payroll processor/platform if identifiable (e.g. 'ADP', 'SAGE', 'PAYSPACE'). If not identifiable, return null.",
    },
    pay_period: {
      type: Type.STRING,
      description: "The pay period this salary covers as 'YYYY-MM' (monthly) or a date range for weekly/bi-weekly. If missing, return null.",
    },
  },
  required: ["salary_date", "salary_amount"],
};

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_salary_detected: {
      type: Type.BOOLEAN,
      description: "True if at least one CREDIT transaction in the statement is confidently identified as a salary/wage/payroll deposit.",
    },
    estimated_monthly_income: {
      type: Type.NUMBER,
      description:
        "The single best estimate of the applicant's net take-home MONTHLY income, derived from salary_transactions. " +
        "If pay_frequency is monthly, use the most recent month's salary_amount (or the average if amounts vary materially). " +
        "If weekly/bi-weekly/fortnightly, convert to a monthly equivalent. Null if is_salary_detected is false.",
    },
    pay_frequency: {
      type: Type.STRING,
      enum: ["monthly", "bi-weekly", "weekly", "fortnightly", "unknown"],
      description: "Frequency inferred from the cadence of recurring salary credits across the whole statement. Default 'monthly' for a single end-of-month credit per period. 'unknown' if unclear.",
    },
    confidence_score: {
      type: Type.NUMBER,
      description:
        "0.0-1.0 confidence in estimated_monthly_income. Score high (0.85-1.0) when: keyword match + regular cadence + consistent amount + " +
        "known sender, seen across multiple months. Medium (0.5-0.84) with 1-2 signals. Low (0.0-0.49) when uncertain or conflicting.",
    },
    confidence_reason: {
      type: Type.STRING,
      description: "Short human-readable reason, under 20 words, e.g. 'Keyword SAL found, consistent monthly credit from same employer across 3 months.'",
    },
    salary_transactions: {
      type: Type.ARRAY,
      description: "Every individual transaction identified as a salary/wage/payroll credit, one per pay cycle found in the statement. Empty array if none found.",
      items: PER_TRANSACTION_SCHEMA,
    },
  },
  required: ["is_salary_detected", "estimated_monthly_income", "pay_frequency", "confidence_score", "confidence_reason", "salary_transactions"],
};

// TODO: remove this hardcoded fallback before any real merge/deploy — set
// GEMINI_API_KEY on Vercel (preview + prod) instead. User asked to hardcode
// it for now (key will be rotated), same as the AlgoLend key fallback in
// CreditFlow.jsx. Project: "MINT OCR SCAN".
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Ij3VwagDL_dCh0BI-AGfTqn4JFSle_bD1uOZLEZqgUxA";

function buildPrompt(months) {
  return (
    `You are analysing a ${months}-month bank statement PDF to verify income for a credit application. ` +
    `Identify every CREDIT transaction that is a salary, wage, or payroll deposit (look for keywords like salary, sal, pay, payroll, wages, ` +
    `remuneration, emolument, stipend; also weigh regular cadence, consistent sender, and consistent or gradually-changing amounts, typically near ` +
    `month-end or a fixed mid-month date). Ignore one-off transfers, refunds, interest, and non-salary income. ` +
    `Return ONLY the structured JSON described by the schema — no commentary.`
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Storage not available" });

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) return res.status(401).json({ success: false, error: authError || "Unauthorized" });

    const body = typeof req.body === "object" && req.body ? req.body : {};
    const path = String(body.path || "").trim();
    const months = [3, 6].includes(Number(body.months)) ? Number(body.months) : 3;
    if (!path) return res.status(400).json({ success: false, error: "Missing path" });
    // A user may only analyse their own upload — paths are namespaced "<userId>/...".
    if (!path.startsWith(`${user.id}/`)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage.from("income-statements").download(path);
    if (dlErr || !fileBlob) {
      return res.status(404).json({ success: false, error: dlErr?.message || "Statement not found" });
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const base64 = buffer.toString("base64");

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            { text: buildPrompt(months) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });

    const raw = response.text;
    let result;
    try {
      result = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[detect-income] Gemini returned non-JSON:", raw);
      return res.status(502).json({ success: false, error: "Could not parse income detection result" });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("[detect-income] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
