import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ShieldCheck, IdCard, MapPin, Smartphone, ScanFace, Search, CheckCircle2, Loader2, Store } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ExperianVerification from "../../components/ExperianVerification";

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
// Experian SA score scale (Delphi-style). Adjust once we see real returns.
const SCORE_MIN = 0;
const SCORE_MAX = 999;
const bandFor = (s) => {
  if (!Number.isFinite(s)) return "No score on file";
  if (s >= 767) return "Excellent";
  if (s >= 681) return "Good";
  if (s >= 614) return "Fair";
  if (s >= 583) return "Average";
  return "Below average";
};

// Segmented semicircle gauge (SVG). Fills purple up to the score fraction.
const ScoreGauge = ({ value }) => {
  const has = Number.isFinite(value);
  const frac = has ? Math.max(0, Math.min(1, (value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN))) : 0;
  const SEGS = 5, GAP = 5, TOTAL = 180;
  const segDeg = (TOTAL - GAP * (SEGS - 1)) / SEGS;
  const cx = 130, cy = 122, r = 104;
  const polar = (deg) => { const a = ((deg - 180) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const arc = (s, e) => { const [x1, y1] = polar(s), [x2, y2] = polar(e); return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`; };
  const filled = frac * SEGS;
  const segs = [];
  let cur = 0;
  for (let i = 0; i < SEGS; i++) { segs.push({ d: arc(cur, cur + segDeg), on: (i + 0.5) < filled }); cur += segDeg + GAP; }
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 150 }}>
      <svg width="260" height="140" viewBox="0 0 260 140">
        {segs.map((s, i) => (
          <path key={i} d={s.d} fill="none" strokeWidth="16" strokeLinecap="round" stroke={s.on ? "#6C3FE0" : "#EDE9FB"} />
        ))}
      </svg>
      <div className="absolute inset-x-0 text-center" style={{ bottom: 6 }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{has ? bandFor(value) : "Credit score"}</div>
        <div className="text-[44px] font-extrabold leading-none text-slate-900" style={{ letterSpacing: "-2px" }}>{has ? Math.round(value) : "—"}</div>
      </div>
    </div>
  );
};

const CreditFlow = ({ profile, onBack, onTabChange }) => {
  // steps: checking | overview | consent | kyc | bureau | marketplace
  const [step, setStep] = useState("checking");
  const [kycVerified, setKycVerified] = useState(false);
  const [consentDone, setConsentDone] = useState(false);
  const [resumeTarget, setResumeTarget] = useState("consent"); // where Continue takes you

  // Bureau step
  const [bureauRunning, setBureauRunning] = useState(false);
  const [score, setScore] = useState(null);
  const [scoreBand, setScoreBand] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [creditDone, setCreditDone] = useState(false);
  const [idOnFile, setIdOnFile] = useState("");
  const [loanAmount, setLoanAmount] = useState(50000);
  const [loanTermMonths, setLoanTermMonths] = useState(24);

  // KYC step: ID-number capture (reuses /api/onboarding/check-id-number — which also
  // creates the Sumsub applicant + saves profiles.id_number) → ExperianVerification.
  const [idNumber, setIdNumber] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [idError, setIdError] = useState("");
  const [idConfirmed, setIdConfirmed] = useState(false);

  const handleIdCheck = useCallback(async () => {
    setIdError("");
    const clean = idNumber.replace(/\D/g, "");
    if (!/^\d{13}$/.test(clean)) { setIdError("Please enter a valid 13-digit ID number."); return; }
    setIdChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setIdError("You must be signed in to continue."); return; }
      const res = await fetch("/api/onboarding/check-id-number", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_number: clean }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to verify ID number.");
      if (result.exists) { setIdError("An account with this ID number already exists."); return; }

      // Persist the ID into user_onboarding.sumsub_raw so the Experian step can
      // read it (idmn/start looks for raw.identity_details.identity_number).
      const userId = session.user?.id;
      if (userId) {
        const { data: rows } = await supabase
          .from("user_onboarding").select("id, sumsub_raw").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(1);
        const row = rows?.[0];
        let raw = {};
        try { raw = typeof row?.sumsub_raw === "string" ? JSON.parse(row.sumsub_raw) : (row?.sumsub_raw || {}); } catch {}
        raw.identity_details = { ...(raw.identity_details || {}), identity_number: clean, applicantId: result.applicantId || raw.identity_details?.applicantId || null, savedAt: new Date().toISOString() };
        raw.identity_details_saved = true;
        if (row?.id) await supabase.from("user_onboarding").update({ sumsub_raw: raw }).eq("id", row.id);
        else await supabase.from("user_onboarding").insert({ user_id: userId, sumsub_raw: raw });
      }
      setIdConfirmed(true);
    } catch (e) {
      setIdError(e?.message || "Failed to verify ID number.");
    } finally {
      setIdChecking(false);
    }
  }, [idNumber]);

  // Persist a credit-flow flag into user_onboarding.sumsub_raw so the journey is
  // resumable — leave mid-flow, come back, continue where you left off (spec MC-04).
  const saveCreditFlag = useCallback(async (patch) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id; if (!uid) return;
      const { data: rows } = await supabase.from("user_onboarding").select("id, sumsub_raw").eq("user_id", uid).order("created_at", { ascending: false }).limit(1);
      const row = rows?.[0];
      let raw = {};
      try { raw = typeof row?.sumsub_raw === "string" ? JSON.parse(row.sumsub_raw) : (row?.sumsub_raw || {}); } catch {}
      Object.assign(raw, patch);
      if (row?.id) await supabase.from("user_onboarding").update({ sumsub_raw: raw }).eq("id", row.id);
      else await supabase.from("user_onboarding").insert({ user_id: uid, sumsub_raw: raw });
    } catch (e) { console.warn("[CreditFlow] saveCreditFlag failed:", e?.message || e); }
  }, []);

  // ── Branch + resume. KYC-only (ignore investment mandate, spec §3.1). ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let kycDone = false, raw = {};
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          const { data: rows } = await supabase.from("user_onboarding").select("sumsub_raw, kyc_status").eq("user_id", uid).order("created_at", { ascending: false }).limit(1);
          const row = rows?.[0];
          kycDone = ["approved", "onboarding_complete", "verified"].includes(row?.kyc_status);
          try { raw = typeof row?.sumsub_raw === "string" ? JSON.parse(row.sumsub_raw) : (row?.sumsub_raw || {}); } catch {}
        }
      } catch (e) {
        console.warn("[CreditFlow] status check failed:", e?.message || e);
      }
      if (cancelled) return;
      const creditKycDone = !!raw.credit_kyc_verified_at;
      const idDone = !!raw.identity_details?.identity_number;
      const consented = !!raw.credit_consent_at;
      const verified = kycDone || creditKycDone;
      const scored = !!raw.credit_score_at;
      setKycVerified(verified);
      setIdConfirmed(idDone);
      setConsentDone(consented);
      setCreditDone(scored);
      setIdOnFile(raw.identity_details?.identity_number || "");
      if (Number.isFinite(Number(raw.credit_score))) { setScore(Number(raw.credit_score)); setScoreBand(bandFor(Number(raw.credit_score))); }
      if (raw.credit_requested_amount) setLoanAmount(Number(raw.credit_requested_amount));
      if (raw.credit_requested_term) setLoanTermMonths(Number(raw.credit_requested_term));
      // Furthest completed point — where "Continue" resumes to.
      setResumeTarget(scored ? "marketplace" : verified ? "bureau" : consented ? "kyc" : "consent");
      // Always land on the overview first (checklist of what's done) — like invest onboarding.
      setStep("overview");
    })();
    return () => { cancelled = true; };
  }, []);

  const goMarketplace = useCallback(() => setStep("marketplace"), []);

  // The single credit bureau enquiry — real Experian pull via /api/credit-check
  // (needs only identity_number + name; reused across all lenders, never re-pulled).
  const runBureau = useCallback(async () => {
    setScoreError("");
    setBureauRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in to continue.");
      const idNum = (idOnFile || profile?.idNumber || profile?.id_number || "").replace(/\D/g, "");
      const forename = profile?.firstName || profile?.first_name || "";
      const surname = profile?.lastName || profile?.last_name || "";
      if (!/^\d{13}$/.test(idNum) || !forename || !surname) {
        throw new Error("Missing verified identity — please complete the previous steps.");
      }
      const res = await fetch("/api/credit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userData: {
            identity_number: idNum, forename, surname,
            postal_code: profile?.postalCode || profile?.postal_code || "0152",
            address1: profile?.address || undefined,
          },
        }),
      });
      const result = await res.json();
      if (!res.ok || result?.success === false) throw new Error(result?.error || "Credit check could not be completed.");
      const s = Number(result.creditScore);
      const hasScore = Number.isFinite(s);
      setScore(hasScore ? s : null);
      setScoreBand(result.score_band || result.riskType || bandFor(s));
      setCreditDone(true);
      await saveCreditFlag({
        credit_score: hasScore ? s : null,
        credit_score_band: result.score_band || result.riskType || bandFor(s),
        credit_score_at: new Date().toISOString(),
        credit_requested_amount: loanAmount,
        credit_requested_term: loanTermMonths,
      });
    } catch (e) {
      setScoreError(e?.message || "Credit check could not be completed.");
    } finally {
      setBureauRunning(false);
    }
  }, [idOnFile, profile, loanAmount, loanTermMonths, saveCreditFlag]);

  // Bouncy purple coin carried over from the old unsecured-credit first page.
  const BouncyCoin = () => (
    <div className="relative mx-auto mb-6 mt-1 flex h-24 w-24 items-start justify-center">
      <div style={{ animation: "subtleBounce 3s ease-in-out infinite" }}>
        <img src="/assets/images/coinAlgoMoney.png" alt="MINT" className="h-20 w-20 object-contain drop-shadow-2xl" />
      </div>
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-12 rounded-[100%] bg-black/10 blur-md"
        style={{ animation: "shadowScale 3s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes subtleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes shadowScale { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; } 50% { transform: translateX(-50%) scale(0.8); opacity: 0.1; } }
      `}</style>
    </div>
  );

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

        {/* ── Overview / resume checklist (always shown first) ── */}
        {step === "overview" && (
          <>
            <Header title="Unsecured credit" />
            <BouncyCoin />
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-center text-base font-semibold text-slate-900">
                {resumeTarget === "consent" ? "Let's get you set up for credit" : "Welcome back — let's continue"}
              </h2>
              <p className="mt-1 text-center text-sm text-slate-500">
                {resumeTarget === "consent"
                  ? "A quick, one-time setup so we can show you offers from multiple lenders."
                  : "Here's where you are — pick up right where you left off."}
              </p>

              <ul className="mt-5 space-y-3">
                {[
                  { done: consentDone, label: "Consent", sub: "Permission to verify & check your credit" },
                  { done: kycVerified, label: "Identity verification", sub: "ID number, document & facial match" },
                  { done: creditDone, label: "Credit check", sub: "A single credit bureau enquiry" },
                  { done: false, label: "Your offers", sub: "Compare lenders side by side" },
                ].map((s) => (
                  <li key={s.label} className="flex items-center gap-3">
                    {s.done ? (
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-200" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${s.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{s.label}</p>
                      <p className="text-xs text-slate-400">{s.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <button type="button" onClick={() => setStep(resumeTarget)} className="mt-6 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
                {resumeTarget === "consent" ? "Get started" : "Continue"}
              </button>
            </section>
          </>
        )}

        {/* ── Consent (new/unverified users only) — credit-specific, NOT platform T&C ── */}
        {step === "consent" && (
          <>
            <Header title="Before we check your credit" />
            <BouncyCoin />
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

              <button type="button" onClick={() => { saveCreditFlag({ credit_consent_at: new Date().toISOString() }); setStep("kyc"); }} className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
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
            {!idConfirmed ? (
              <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <IdCard className="h-6 w-6" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Your ID number</h2>
                <p className="mt-2 text-sm text-slate-500">Enter your 13-digit South African ID number to begin verification.</p>
                <input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))}
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="0000000000000"
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm tracking-widest text-slate-900 outline-none focus:border-violet-400"
                />
                {idError && <p className="mt-2 text-xs font-medium text-red-500">{idError}</p>}
                <button
                  type="button"
                  onClick={handleIdCheck}
                  disabled={idChecking}
                  className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
                >
                  {idChecking ? "Checking…" : "Continue"}
                </button>
              </section>
            ) : (
              // Reuses the shared KYC infra (Experian IDMN — liveness + facial match
              // vs Home Affairs + ID-document OCR, which credit requires inline).
              <ExperianVerification
                requireOcr
                onVerified={() => { saveCreditFlag({ credit_kyc_verified_at: new Date().toISOString() }); setStep("bureau"); }}
              />
            )}
          </>
        )}

        {step === "bureau" && (
          <>
            <Header title="Credit check" />

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <ScoreGauge value={score} />
              <p className="mt-1 text-center text-xs text-slate-400">
                {creditDone ? `${scoreBand} · one enquiry, reused across all lenders` : "We run a single credit bureau enquiry — reused across every lender, so your score is protected."}
              </p>
              {scoreError && <p className="mt-3 text-center text-xs font-medium text-red-500">{scoreError}</p>}
              <button
                type="button"
                onClick={runBureau}
                disabled={bureauRunning}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
              >
                {bureauRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {bureauRunning ? "Checking your credit…" : creditDone ? "Run again" : "Run credit check"}
              </button>
            </section>

            {/* Lean loan config — amount + term only. Lenders set the actual rate/terms. */}
            <section className="mt-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">What you're looking for</h3>
              <p className="mt-1 text-xs text-slate-400">We'll match you to lenders for this amount and term.</p>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount</span>
                  <span className="text-xl font-extrabold text-violet-600">R {loanAmount.toLocaleString("en-ZA")}</span>
                </div>
                <input
                  type="range" min={5000} max={500000} step={5000} value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="mt-3 w-full accent-violet-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>R 5k</span><span>R 500k</span></div>
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Repayment term</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[12, 24, 36, 48, 60].map((m) => (
                    <button
                      key={m} type="button" onClick={() => setLoanTermMonths(m)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${loanTermMonths === m ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
                    >
                      {m} mo
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {creditDone && (
              <button type="button" onClick={goMarketplace} className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
                See my offers
              </button>
            )}
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
