// server/validation.cjs — Zod schemas for all financial API routes
// Every schema uses .strict() to reject unknown extra fields (prevents parameter pollution).

const { z } = require("zod");

// ── Reusable field types ──────────────────────────────────────────────────
const positiveAmount = z.number({ invalid_type_error: "amount must be a number" }).positive("amount must be greater than 0");
const optionalUuid   = z.string().uuid("must be a valid UUID").optional().nullable();
const optionalStr    = z.string().max(500).optional().nullable();

// ── Schemas ───────────────────────────────────────────────────────────────

const recordInvestmentSchema = z.object({
  amount:             positiveAmount,
  baseAmount:         z.number().positive().optional().nullable(),
  paymentMethod:      z.enum(["wallet", "ozow", "direct_eft", "paystack", "eft"], {
                        errorMap: () => ({ message: "paymentMethod must be wallet, ozow, direct_eft, paystack, or eft" }),
                      }),
  securityId:         optionalUuid,
  symbol:             optionalStr,
  name:               optionalStr,
  strategyId:         optionalUuid,
  paymentReference:   optionalStr,
  shareCount:         z.number().nonnegative().optional().nullable(),
  feesBreakdown:      z.object({
                        bufferedBase:      z.number().optional(),
                        brokerAmount:      z.number().optional(),
                        isinTotal:         z.number().optional(),
                        transactionAmount: z.number().optional(),
                        totalFees:         z.number().optional(),
                      }).optional().nullable(),
  childUserId:        optionalUuid,
  childFamilyMemberId: z.union([z.string(), z.number()]).optional().nullable(),
});

const eftDepositSchema = z.object({
  amount:     positiveAmount,
  reference:  optionalStr,
  securityId: optionalUuid,
  symbol:     optionalStr,
  name:       optionalStr,
  strategyId: optionalUuid,
  baseAmount: z.number().positive().optional().nullable(),
  shareCount: z.number().nonnegative().optional().nullable(),
});

const ozowInitiateSchema = z.object({
  amount:       positiveAmount,
  strategyName: optionalStr,
  strategyId:   optionalUuid,
  userId:       z.string().uuid("userId must be a valid UUID"),
  userEmail:    z.string().email("userEmail must be a valid email").optional().nullable(),
  successUrl:   z.string().url().optional().nullable(),
  cancelUrl:    z.string().url().optional().nullable(),
  errorUrl:     z.string().url().optional().nullable(),
  notifyUrl:    z.string().url().optional().nullable(),
});

const ozowRecordSuccessSchema = z.object({
  transactionRef: z.string()
    .min(1)
    .max(200)
    .regex(/^MINT-/, "transactionRef must start with MINT-"),
  strategyId:     z.string().uuid("strategyId must be a valid UUID"),
  amount:         positiveAmount,
});

const familyMemberSchema = z.object({
  primary_user_id:                z.string().uuid("primary_user_id must be a valid UUID"),
  relationship:                   z.enum(["spouse", "child"], {
                                    errorMap: () => ({ message: "relationship must be spouse or child" }),
                                  }),
  first_name:                     z.string().max(100).optional().nullable(),
  last_name:                      z.string().max(100).optional().nullable(),
  date_of_birth:                  z.string().max(50).optional().nullable(),
  id_number:                      z.string().max(20).optional().nullable(),
  email:                          z.string().email().optional().nullable(),
  certificate_url:                z.string().url().optional().nullable(),
  certificate_verification_status: optionalStr,
  mode:                           z.enum(["link", "invite"]).optional(),
});

const confirmPairingSchema = z.object({
  member_id: z.union([z.string().min(1), z.number()]),
  code:      z.string().regex(/^\d{6}$/, "code must be exactly 6 digits"),
});

// ── Validation helper ─────────────────────────────────────────────────────
// Returns parsed (coerced) data on success, or sends a 400 and returns null.
// Usage:  const body = validate(mySchema, req.body, res);  if (!body) return;
function validate(schema, rawBody, res) {
  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const errors = result.error.issues
      .map(i => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`)
      .join("; ");
    res.status(400).json({ success: false, error: `Validation failed — ${errors}` });
    return null;
  }
  return result.data;
}

module.exports = {
  recordInvestmentSchema,
  eftDepositSchema,
  ozowInitiateSchema,
  ozowRecordSuccessSchema,
  familyMemberSchema,
  confirmPairingSchema,
  validate,
};
