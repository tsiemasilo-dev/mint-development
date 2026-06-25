import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ShieldCheck, IdCard, MapPin, Smartphone, ScanFace, Search, CheckCircle2, Loader2, Store } from "lucide-react";
import { supabase } from "../../lib/supabase";

/**
 * CreditFlow — the unsecured-credit journey per the MINT Credit Journey spec (§3).
 * This is the SPINE: tap Credit → branch on KYC status → (consent → real-time KYC →
 * single bureau pull) → marketplace. The branch + consent are real; KYC, bureau and
 * marketplace are labelled placeholders wired in later (KYC reuses onboarding KYC;
 * bureau reuses the single Experian pull; marketplace = AlgoLend, deferred).
 *
 * IMPORTANT: the "verified?" branch is KYC-ONLY, not full onboarding — a credit
 * applicant must NOT be required to sign an investment mandate (spec §3.1).
 */
const CreditFlow = ({ profile, onBack, onTabChange }) => {
  // steps: checking | consent | kyc | bureau | marketplace
  const [step, setStep] = useState("checking");
  const [kycVerified, setKycVerified] = useState(false);

  // ── Branch: is the user KYC-verified? (KYC only, ignore investment mandate) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let kycDone = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const r = await fetch("/api/onboarding/status", { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json();
          kycDone = !!(j?.flags?.kycDone);
        }
      } catch (e) {
        console.warn("[CreditFlow] KYC status check failed:", e?.message || e);
      }
      if (cancelled) return;
      setKycVerified(kycDone);
      // Path A (verified) → straight to the bureau step (reuse on-file score later).
      // Path B (not verified) → consent first.
      setStep(kycDone ? "bureau" : "consent");
    })();
    return () => { cancelled = true; };
  }, []);

  const goMarketplace = useCallback(() => setStep("marketplace"), []);

  const Header = ({ title }) => (
    <header className="flex items-center gap-3 mb-6 relative">
      <button type="button" onClick={onBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
    </header>
  );

  // ── Stub node (KYC / bureau / marketplace get filled in later) ──
  const Stub = ({ icon: Icon, title, body, cta, onCta, tone = "violet" }) => (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm text-center">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
      <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">Coming next</p>
      {cta && (
        <button type="button" onClick={onCta} className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
          {cta}
        </button>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">

        {step === "checking" && (
          <>
            <Header title="Credit" />
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="mt-3 text-sm">Checking your verification…</p>
            </div>
          </>
        )}

        {/* ── Consent (new/unverified users only) — credit-specific, NOT platform T&C ── */}
        {step === "consent" && (
          <>
            <Header title="Before we check your credit" />
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">We need your permission to continue</h2>
              <p className="mt-2 text-sm text-slate-500">To show you credit offers, MINT will:</p>

              <ul className="mt-4 space-y-3">
                {[
                  { icon: IdCard, t: "Verify your identity", d: "ID, proof of address, cellphone, and a facial match against Home Affairs records." },
                  { icon: Search, t: "Run ONE credit check", d: "A single credit bureau enquiry — done once." },
                  { icon: Store, t: "Show you multiple lenders", d: "That one check is shared with every lender — never repeated per lender, so your score is protected." },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t}</p>
                      <p className="text-xs text-slate-500">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                If you decline, we can't show you credit offers — we can't make an offer without verifying who you are and checking your credit. You can come back any time.
              </p>

              <button type="button" onClick={() => setStep("kyc")} className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
                I agree — continue
              </button>
              <button type="button" onClick={onBack} className="mt-2 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-500">
                Not now
              </button>
            </section>
          </>
        )}

        {step === "kyc" && (
          <>
            <Header title="Verify your identity" />
            <Stub
              icon={ScanFace}
              title="Real-time verification"
              body="We'll verify your ID, address, cellphone and a facial match — reusing the verification you may already have on file, so you don't repeat steps."
              cta="Continue (stub → bureau)"
              onCta={() => setStep("bureau")}
            />
          </>
        )}

        {step === "bureau" && (
          <>
            <Header title="Credit check" />
            <Stub
              icon={Search}
              title="One credit bureau check"
              body={kycVerified
                ? "You're already verified — we'll reuse your on-file credit score (or refresh it if it's older than our window) before showing offers."
                : "We run a single credit bureau enquiry and reuse it across every lender."}
              cta="Continue (stub → lenders)"
              onCta={goMarketplace}
            />
          </>
        )}

        {step === "marketplace" && (
          <>
            <Header title="Your credit offers" />
            <Stub
              icon={Store}
              tone="slate"
              title="Comparing lenders…"
              body="This is where the lender marketplace will appear — every lender that would extend you an offer, side by side. Powered by AlgoLend (integration coming later)."
            />
          </>
        )}

      </div>
    </div>
  );
};

export default CreditFlow;
