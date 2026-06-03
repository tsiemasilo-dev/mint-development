---
name: Onboarding reset — KYC lives in a separate table
description: Why resetting user_onboarding alone leaves Step 1 (identity/KYC) still showing complete
---

# Resetting a user's onboarding fully

Onboarding completion is computed from MULTIPLE sources, not just `user_onboarding`. A full reset that only clears `user_onboarding` leaves Step 1 (identity/KYC) showing complete.

**Why:** `/api/sumsub/status` returns `status: "verified"` immediately if ANY row exists in `user_onboarding_pack_details` for the user — it shortcuts before ever calling Sumsub. The onboarding page's KYC check reads that and marks Step 1 done + auto-advances. So the KYC "done" state is backed by `user_onboarding_pack_details`, NOT by `user_onboarding.kyc_status`.

**How to apply — to reset a user's onboarding:**
- `user_onboarding`: set `kyc_status=null`, `sumsub_raw={}`, clear bank/tax/employment/agreement/signed columns, `bank_letter_uploaded=false`.
- `user_onboarding_pack_details`: DELETE the user's row (this is what gates Step 1 / KYC).
- `required_actions`: `kyc_verified=false`, `bank_linked=false`, `kyc_pending=false`, etc.
- `profiles.address`: clear (the address step reads from here too).

**Per-step admin reset convention:** `UserOnboardingPage` load logic honours `sumsub_raw.address_saved === false` to mark ONLY the Residential Address step ("Step 2 of 5") incomplete while keeping `kyc_status='onboarding_complete'` and all other steps done. Comment in code: "Respect explicit admin reset".

**Step number mapping (internal `step` state vs user-facing "Step N of 5" labels):**
- internal step 1 = "Step 1 of 5" Identity & Verification (ID number + Sumsub KYC)
- internal step 2 = Sumsub KYC screen (no own label)
- internal step 3 = "Step 2 of 5" Residential Address (`address_saved` + `profiles.address`)
- internal step 4 = "Step 3 of 5" Financial Details (tax + bank + bank letter + source of funds)
- internal step 5 = "Step 4 of 5" Mandate
- internal step 6 = Final Agreements (risk + terms + account agreement signed)
- internal step 7 = Review
