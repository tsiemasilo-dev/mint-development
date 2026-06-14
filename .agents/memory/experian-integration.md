---
name: Experian Integration
description: Sumsub KYC replaced with Experian KYC V2 bureau check + ID Me Now biometric workflow. Covers credentials, UAT endpoints, flow, and DB mapping.
---

# Experian KYC V2 + ID Me Now Integration

## Credentials (stored as Replit secrets)
- `EXPERIAN_KYC_USERNAME` / `EXPERIAN_KYC_PASSWORD` — KYC V2 REST auth (sent in request body)
- `EXPERIAN_IDMN_USERNAME` / `EXPERIAN_IDMN_PASSWORD` — IDMN Basic Auth (Authorization header)
- User provided: username `32389-api` — same creds for both services (UAT)

## UAT Endpoints
- KYC V2 REST: `https://apis-uat.experian.co.za:9443/KycService/RequestNewKYC`
- IDMN StartWorkflow: `https://apis-uat.experian.co.za:9443/IdMeNow/StartWorkflow`
- IDMN CollectWorkflowResults: `https://apis-uat.experian.co.za:9443/IdMeNow/CollectWorkflowResults`
- UAT TLS uses self-signed cert — `rejectUnauthorized: false` set in `experianRequest()`

**Why:** UAT cert is not CA-signed; Node.js rejects it by default. Must use custom `https.Request` with `rejectUnauthorized: false` — not the built-in `fetch`.

## Workflow IDs (IDMN)
- UAT workflow 14 = Full ID Me Now (face match + AML screening) — what Mint uses
- PROD equivalent would be workflow 10

## Server Routes Added (server/index.cjs, ~line 1956)
- `POST /api/experian/kyc` — KYC V2 bureau check; auth in JSON body
- `POST /api/experian/idmn/start` — StartWorkflow; returns Experian-hosted URL
- `POST /api/experian/idmn/collect` — CollectWorkflowResults; maps outcome to kyc_status
- `POST /api/experian/status` — replaces `/api/sumsub/status`; reads from DB only

## Frontend Changes
- `src/components/ExperianVerification.jsx` — replaces SumsubVerification.jsx (redirect-based, not embedded SDK)
- `src/lib/useSumsubStatus.js` — endpoint changed to `/api/experian/status` (file kept, names unchanged for compatibility)
- `src/pages/UserOnboardingPage.jsx` — imports ExperianVerification; checkKycStatus uses `/api/experian/status`
- `SumsubVerification.jsx` left in place as dead file (no longer imported)

## Database Mapping (no schema changes needed)
Experian data stored in existing Sumsub columns:
- `sumsub_applicant_id` → stores IDMN `transaction_id`
- `sumsub_review_status` → stores normalized kyc_status string
- `sumsub_review_answer` → "GREEN" (verified) or "RED" (failed)
- `sumsub_raw` JSONB → stores `experian_kyc_result`, `experian_idmn_transaction_id`, `experian_idmn_token`, `experian_idmn_result`
- `kyc_status` column → "pending" / "verified" / "resubmission_required" / "onboarding_complete"
- `required_actions` → `kyc_verified`, `kyc_pending`, `kyc_needs_resubmission` (unchanged)

## Verification Flow
1. User enters 13-digit SA ID → `handleIdentityCheckContinue` → saves to `sumsub_raw.identity_details.identity_number`
2. `ExperianVerification` mounts → calls `/api/experian/idmn/start`
3. Server reads ID from DB, calls StartWorkflow (workflow_id=14), gets back Experian-hosted URL
4. Frontend opens URL in new tab → user completes selfie/liveness on Experian page
5. User clicks "I've completed the verification" → calls `/api/experian/idmn/collect`
6. Server calls CollectWorkflowResults; IMN_202 = still pending, Success = verified, Failure = failed
7. On verified: `kyc_status="verified"`, `required_actions.kyc_verified=true`, pack_details record created

## Error Code Mapping (IDMN Collect)
- `response_status: "Success"` → verified (GREEN)
- `error_code: "IMN_202"` → still in progress, show "check again"
- `error_code: "IMN_205"` or `"IMN_208"` → no results / expired → not_verified
- `response_status: "Failure"` (other) → failed (RED)
