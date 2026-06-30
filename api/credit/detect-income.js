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

// GEMINI_API_KEY must be set on Vercel (preview + prod) — no hardcoded fallback.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(months) {
  return (
    `You are analysing a ${months}-month bank statement PDF to verify income for a credit application. ` +
    `Identify every CREDIT transaction that is a salary, wage, or payroll deposit (look for keywords like salary, sal, pay, payroll, wages, ` +
    `remuneration, emolument, stipend; also weigh regular cadence, consistent sender, and consistent or gradually-changing amounts, typically near ` +
    `month-end or a fixed mid-month date). Ignore one-off transfers, refunds, interest, and non-salary income.\n\n` +
    `CRITICAL RULES:\n` +
    `1. Each entry in salary_transactions MUST be exactly ONE deposit line from the statement. NEVER merge, add, or sum multiple ` +
    `deposits into a single entry, and NEVER report a total of several pay cycles as one amount.\n` +
    `2. estimated_monthly_income is the income for a SINGLE month — it must NEVER be the sum of all salary deposits across the statement. ` +
    `If you see (for example) three salary deposits of R4,000, R4,000 and R7,000, the monthly income is NOT R15,000.\n` +
    `3. A salary often arrives under a company, payroll, or sender NAME with NO salary keyword at all (e.g. a recurring real-time transfer from ` +
    `the same company). Treat a recurring credit of similar amount and regular cadence from the same sender as salary even when no keyword is present. ` +
    `Do not skip a pay deposit just because the word "salary" is absent.\n` +
    `4. If the salary AMOUNT or SENDER changes partway through the statement (a raise or a change of employer), base estimated_monthly_income on the ` +
    `MOST RECENT recurring amount, not the older amounts and not a blend of both.\n` +
    `5. List salary_transactions in chronological order (oldest first).\n\n` +
    `Return ONLY the structured JSON described by the schema — no commentary.`
  );
}

// ── Deterministic reconciliation ────────────────────────────────────────────
// The model is reliable at SPOTTING individual salary deposits but unreliable at
// turning them into one monthly figure (it tends to sum pay cycles). So we ignore
// the model's estimated_monthly_income and recompute it in code from the
// per-deposit list, using the most-recent recurring "tier" of deposits and the
// gaps BETWEEN them (never by summing calendar months).

function parseStatementDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Map the typical gap (in days) between consecutive salary deposits to a pay
// frequency and a per-month multiplier. This is what distinguishes "two R7,000
// deposits 28 days apart = R7,000/month" from "two R7,000 deposits 15 days
// apart = R14,000/month" — the gap, not the calendar month.
function frequencyForGap(gapDays) {
  if (gapDays == null) return { frequency: "monthly", perMonth: 1, certain: false };
  if (gapDays <= 10) return { frequency: "weekly", perMonth: 30.44 / 7, certain: true };
  if (gapDays <= 18) return { frequency: "fortnightly", perMonth: 30.44 / 14, certain: true };
  if (gapDays <= 45) return { frequency: "monthly", perMonth: 1, certain: true };
  return { frequency: "monthly", perMonth: 1, certain: false };
}

function reconcileIncome(result) {
  const txns = Array.isArray(result?.salary_transactions) ? result.salary_transactions : [];
  const valid = txns
    .map((t) => ({ raw: t, date: parseStatementDate(t.salary_date), amount: Number(t.salary_amount) }))
    .filter((t) => t.date && Number.isFinite(t.amount) && t.amount > 0)
    .sort((a, b) => a.date - b.date);

  // Nothing usable to reconcile — leave the model output untouched.
  if (!valid.length) return result;

  // Write the deposits back in chronological order so the UI's "last deposit"
  // is genuinely the most recent one.
  result.salary_transactions = valid.map((t) => t.raw);

  const latestAmount = valid[valid.length - 1].amount;

  // Most-recent recurring tier: walk back from the newest deposit, keeping
  // consecutive deposits within ±20% of the latest amount. This drops a
  // superseded older salary level (e.g. an old R4,000 run before a raise to R7,000).
  const tier = [];
  for (let i = valid.length - 1; i >= 0; i--) {
    if (Math.abs(valid[i].amount - latestAmount) <= latestAmount * 0.2) tier.unshift(valid[i]);
    else break;
  }

  const representative = median(tier.map((t) => t.amount)) ?? latestAmount;

  // Cadence is inferred ONLY from gaps within the recent tier. If the tier is a
  // single deposit we cannot establish its own cadence — we deliberately do NOT
  // borrow gaps from older, differently-sized pay (that would, e.g., misread a
  // lone recent R7,000 against an older R4,000 run as "fortnightly R7,000").
  // A single recent deposit defaults to monthly and is flagged for confirmation.
  const gaps = [];
  if (tier.length >= 2) {
    for (let i = 1; i < tier.length; i++) {
      gaps.push(Math.round((tier[i].date - tier[i - 1].date) / 86400000));
    }
  }
  const medGap = median(gaps);
  const { frequency, perMonth, certain } = frequencyForGap(medGap);

  const computed = Math.round(representative * perMonth);
  const modelEstimate = Number(result.estimated_monthly_income) || null;
  const diverged = modelEstimate ? Math.abs(modelEstimate - computed) / computed > 0.25 : false;

  result.model_estimated_monthly_income = modelEstimate;
  result.estimated_monthly_income = computed;
  result.pay_frequency = frequency;
  result.detection_method = "deterministic_reconciled";

  const repLabel = `R${representative.toLocaleString("en-ZA")}`;
  if (diverged) {
    result.confidence_score = Math.min(Number(result.confidence_score) || 0.5, 0.6);
    result.confidence_reason =
      `Using most recent recurring deposit (${repLabel}, ~${frequency}). ` +
      `Automated estimate differed (R${(modelEstimate || 0).toLocaleString("en-ZA")}) — please confirm.`;
  } else if (!certain) {
    result.confidence_score = Math.min(Number(result.confidence_score) || 0.7, 0.7);
    result.confidence_reason =
      `Based on the most recent deposit (${repLabel}); pay cadence unclear, assumed ${frequency}. Please confirm.`;
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Storage not available" });
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ success: false, error: "Income AI is not configured (missing GEMINI_API_KEY)" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) return res.status(401).json({ success: false, error: authError || "Unauthorized" });

    const body = typeof req.body === "object" && req.body ? req.body : {};
    const path = String(body.path || "").trim();
    const months = [3, 6].includes(Number(body.months)) ? Number(body.months) : 6;
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
        // Deterministic decoding — same statement should yield the same read.
        temperature: 0,
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

    // Recompute estimated_monthly_income deterministically from the per-deposit
    // list — never trust the model's own summed figure.
    result = reconcileIncome(result);

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("[detect-income] Unexpected error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unexpected server error" });
  }
}
