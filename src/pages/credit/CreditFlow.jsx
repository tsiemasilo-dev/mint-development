import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, ShieldCheck, IdCard, MapPin, Smartphone, ScanFace, Search, CheckCircle2, Loader2, Store, ChevronRight, SlidersHorizontal, Star, X } from "lucide-react";
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

// Lender marketplace — stub providers until AlgoLend's marketplace is wired in
// (per spec, AlgoLend supplies the real lender list + live terms; this gets the
// comparison/select/submit UX working end-to-end today).
const STUB_PROVIDERS = [
  { id: "std", name: "Standard Bank", short: "SB", bg: "#0A7B5E", type: "Home loan", cat: "home", rate: 11.75, limit: "R 5,000,000", rawLimit: 5000000, term: "30 yrs", minIncome: "R 15k/mo", rating: 4.6, reviews: 1840, eligible: true, badge: "Lowest rate" },
  { id: "cap", name: "Capitec", short: "CA", bg: "#4C3AA3", type: "Personal loan", cat: "personal", rate: 12.0, limit: "R 250,000", rawLimit: 250000, term: "84 mo", minIncome: "R 5k/mo", rating: 4.4, reviews: 3120, eligible: true, badge: "Most popular" },
  { id: "absa", name: "ABSA", short: "AB", bg: "#B02020", type: "Personal loan", cat: "personal", rate: 12.5, limit: "R 350,000", rawLimit: 350000, term: "72 mo", minIncome: "R 8k/mo", rating: 4.2, reviews: 2760, eligible: true, badge: null },
  { id: "ned", name: "Nedbank", short: "NB", bg: "#5B2FD4", type: "Vehicle finance", cat: "vehicle", rate: 13.25, limit: "R 500,000", rawLimit: 500000, term: "72 mo", minIncome: "R 10k/mo", rating: 4.1, reviews: 1490, eligible: false, badge: "Fast approval" },
  { id: "fnb", name: "FNB", short: "FNB", bg: "#15457A", type: "Credit card", cat: "personal", rate: 14.0, limit: "R 80,000", rawLimit: 80000, term: "Revolving", minIncome: "R 7k/mo", rating: 4.3, reviews: 2180, eligible: true, badge: null },
];

const APP_STATUS = {
  in_review: { label: "In review", cls: "bg-amber-50 text-amber-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600" },
  complete: { label: "Complete", cls: "bg-emerald-50 text-emerald-700" },
};

// Segmented semicircle gauge — canvas port of the reference design: 4 thick
// rounded segments with 8° gaps, purple fill flows continuously up to the score
// fraction, with a count-up of the number.
const ScoreGauge = ({ value }) => {
  const canvasRef = useRef(null);
  const numRef = useRef(null);
  const rafRef = useRef(null);
  const has = Number.isFinite(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const CW = canvas.width, CH = canvas.height;       // 520 x 300 (hi-res)
    const cx = CW / 2, cy = CH - 20, R = 205;
    const SEGS = 4, SEG_W = 22, GAP_DEG = 8, TOTAL_DEG = 180;
    const SEG_DEG = (TOTAL_DEG - GAP_DEG * (SEGS - 1)) / SEGS;
    const PURPLE = "#6C3FE0", TRACK = "#EDE9FB";
    const toRad = (deg) => ((180 + deg) * Math.PI) / 180; // 0° = left
    const targetFrac = has ? Math.max(0, Math.min(1, (value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN))) : 0;

    const draw = (progress) => {
      ctx.clearRect(0, 0, CW, CH);
      const filledDeg = targetFrac * progress * TOTAL_DEG;
      let cursor = 0;
      for (let i = 0; i < SEGS; i++) {
        const segStart = cursor, segEnd = cursor + SEG_DEG;
        ctx.beginPath(); ctx.arc(cx, cy, R, toRad(segStart), toRad(segEnd));
        ctx.strokeStyle = TRACK; ctx.lineWidth = SEG_W; ctx.lineCap = "round"; ctx.stroke();
        const fillEnd = Math.min(segEnd, filledDeg);
        if (fillEnd > segStart) {
          ctx.beginPath(); ctx.arc(cx, cy, R, toRad(segStart), toRad(fillEnd));
          ctx.strokeStyle = PURPLE; ctx.lineWidth = SEG_W; ctx.lineCap = "round"; ctx.stroke();
        }
        cursor += SEG_DEG + GAP_DEG;
      }
    };

    let startT = null; const dur = 1300;
    const tick = (t) => {
      if (startT == null) startT = t;
      const p = Math.min((t - startT) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      draw(ease);
      if (numRef.current) numRef.current.textContent = has ? String(Math.round(value * ease)) : "—";
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, has]);

  return (
    <div className="relative mx-auto" style={{ width: 260, height: 150 }}>
      <canvas ref={canvasRef} width={520} height={300} style={{ width: 260, height: 150, position: "absolute", top: 0, left: 0 }} />
      <div className="absolute inset-x-0 text-center" style={{ bottom: 4 }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{has ? bandFor(value) : "Credit score"}</div>
        <div ref={numRef} className="text-[44px] font-extrabold leading-none text-slate-900" style={{ letterSpacing: "-2px" }}>—</div>
      </div>
    </div>
  );
};

const CreditFlow = ({ profile, onBack, onTabChange }) => {
  // steps: checking | overview | consent | kyc | bureau | marketplace | marketplaceOffers
  const [step, setStep] = useState("checking");
  const [kycVerified, setKycVerified] = useState(false);
  const [consentDone, setConsentDone] = useState(false);
  const [resumeTarget, setResumeTarget] = useState("consent"); // where Continue takes you

  // Bureau step
  const [bureauRunning, setBureauRunning] = useState(false);
  const [score, setScore] = useState(null);
  const [scoreBand, setScoreBand] = useState("");
  const [scoreReasons, setScoreReasons] = useState([]);
  const [scoreError, setScoreError] = useState("");
  const [creditDone, setCreditDone] = useState(false);
  const [idOnFile, setIdOnFile] = useState("");
  const [loanAmount, setLoanAmount] = useState(50000);
  const [loanTermMonths, setLoanTermMonths] = useState(3);
  // Address (Experian requires street + suburb + postal). Prompted if missing/rejected.
  const [addrPrompt, setAddrPrompt] = useState(false);
  const [addr1, setAddr1] = useState("");   // street / line 1
  const [addr2, setAddr2] = useState("");   // suburb / line 2
  const [addr3, setAddr3] = useState("");   // city / line 3 (optional)
  const [addrPostal, setAddrPostal] = useState("");
  const [addrLookupLoading, setAddrLookupLoading] = useState(false);

  // Marketplace: "My applications" list → tap one → provider comparison.
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [activeApplication, setActiveApplication] = useState(null);
  const [providerSel, setProviderSel] = useState(new Set());
  const [providerFilterOpen, setProviderFilterOpen] = useState(false);
  const [providerEligOnly, setProviderEligOnly] = useState(false);
  const [providerSort, setProviderSort] = useState("rate");
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [providerSubmitted, setProviderSubmitted] = useState(false);

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
      // Address sources (best-effort): a previously-entered credit address →
      // onboarding manual address → bureau KYC address → profile.
      const ca = raw.credit_address || {};
      const ad = raw.address_details || {};
      const kyc0 = (Array.isArray(raw.experian_kyc_addresses) && raw.experian_kyc_addresses[0]) || {};
      setAddr1(ca.address1 || ad.street || (kyc0.lines && kyc0.lines[0]) || profile?.address || "");
      setAddr2(ca.address2 || ad.city || ad.suburb || (kyc0.lines && kyc0.lines[1]) || "");
      setAddr3(ca.address3 || (kyc0.lines && kyc0.lines[2]) || "");
      setAddrPostal(ca.postal_code || ad.postal_code || kyc0.postalCode || profile?.postalCode || profile?.postal_code || "");
      if (Number.isFinite(Number(raw.credit_score))) { setScore(Number(raw.credit_score)); setScoreBand(raw.credit_score_band || bandFor(Number(raw.credit_score))); }
      if (Array.isArray(raw.credit_score_reasons)) setScoreReasons(raw.credit_score_reasons);
      if (raw.credit_requested_amount) setLoanAmount(Number(raw.credit_requested_amount));
      if (raw.credit_requested_term) setLoanTermMonths(Number(raw.credit_requested_term));
      // Furthest completed point — where "Continue" resumes to.
      setResumeTarget(scored ? "marketplace" : verified ? "bureau" : consented ? "kyc" : "consent");
      // Always land on the overview first (checklist of what's done) — like invest onboarding.
      setStep("overview");
    })();
    return () => { cancelled = true; };
  }, []);

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setApplications([]); return; }
      const { data } = await supabase
        .from("credit_marketplace_applications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setApplications(data || []);
    } catch (e) {
      console.warn("[CreditFlow] loadApplications failed:", e?.message || e);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  const goMarketplace = useCallback(() => { setStep("marketplace"); loadApplications(); }, [loadApplications]);

  const openApplication = useCallback((app) => {
    setActiveApplication(app);
    const existing = Array.isArray(app.selected_providers) ? app.selected_providers : [];
    setProviderSel(new Set(existing.map((p) => p.provider_id)));
    setProviderSubmitted(existing.length > 0);
    setStep("marketplaceOffers");
  }, []);

  const toggleProviderSel = useCallback((id) => {
    setProviderSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const submitProviderSelections = useCallback(async () => {
    if (!activeApplication || providerSel.size === 0) return;
    setProviderSubmitting(true);
    try {
      const selected = [...providerSel].map((id) => {
        const p = STUB_PROVIDERS.find((x) => x.id === id);
        return { provider_id: id, provider_name: p?.name || id };
      });
      await supabase.from("credit_marketplace_applications").update({ selected_providers: selected, updated_at: new Date().toISOString() }).eq("id", activeApplication.id);
      setProviderSubmitted(true);
    } catch (e) {
      console.warn("[CreditFlow] submit selections failed:", e?.message || e);
    } finally {
      setProviderSubmitting(false);
    }
  }, [activeApplication, providerSel]);

  const sortedProviders = useMemo(() => {
    let list = STUB_PROVIDERS.filter((p) => !providerEligOnly || p.eligible);
    list = [...list];
    if (providerSort === "rate") list.sort((a, b) => a.rate - b.rate);
    else if (providerSort === "limit") list.sort((a, b) => b.rawLimit - a.rawLimit);
    else list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [providerEligOnly, providerSort]);

  // Auto-fetch the applicant's address from Experian's KYC lookup (reuses the
  // bureau record), so the credit check has a valid address without typing.
  // Returns { address1, address2, address3, postal_code } or null.
  const fetchKycAddress = useCallback(async (idNum, forename, surname) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/experian/kyc-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ identity_number: idNum, forename, surname }),
      });
      const data = await res.json();
      const a = (data?.addresses || []).find((x) => Array.isArray(x.lines) && x.lines.length) || (data?.addresses || [])[0];
      if (!a || !Array.isArray(a.lines) || !a.lines.length) return null;
      return { address1: a.lines[0] || "", address2: a.lines[1] || "", address3: a.lines[2] || "", postal_code: a.postalCode || "" };
    } catch (e) {
      console.warn("[CreditFlow] KYC address lookup failed:", e?.message || e);
      return null;
    }
  }, []);

  // The single credit bureau enquiry — real Experian pull via /api/credit-check.
  // ID is mandatory (fetched first). Address (street+suburb+postal) is required by
  // Experian; we auto-fetch it from the KYC lookup, and only prompt if the bureau
  // has none on file. ClientRef is sanitized server-side (≤20).
  const runBureau = useCallback(async () => {
    setScoreError("");
    const idNum = (idOnFile || profile?.idNumber || profile?.id_number || "").replace(/\D/g, "");
    const forename = profile?.firstName || profile?.first_name || "";
    const surname = profile?.lastName || profile?.last_name || "";
    // ID is the one thing we can't proceed without — it's fetched at the very start.
    if (!/^\d{13}$/.test(idNum) || !forename || !surname) {
      setScoreError("We couldn't find your verified ID — please complete the identity step first.");
      return;
    }

    // Resolve the address: use what we have, else auto-fetch from Experian KYC,
    // else prompt. Experian rejects the enquiry without address1+address2+postal.
    let street = (addr1 || "").trim(), suburb = (addr2 || "").trim(), line3 = (addr3 || "").trim(), postal = (addrPostal || "").trim();
    if (!street || !suburb || !postal) {
      setAddrLookupLoading(true);
      const got = await fetchKycAddress(idNum, forename, surname);
      setAddrLookupLoading(false);
      if (got && got.address1 && got.address2 && got.postal_code) {
        street = got.address1; suburb = got.address2; line3 = got.address3 || ""; postal = got.postal_code;
        setAddr1(street); setAddr2(suburb); setAddr3(line3); setAddrPostal(postal);
      } else {
        setAddrPrompt(true);
        setScoreError("We couldn't find your address on file — please enter it to continue.");
        return;
      }
    }

    setBureauRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in to continue.");
      const res = await fetch("/api/credit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userData: {
            identity_number: idNum, forename, surname,
            gender: profile?.gender || undefined,
            date_of_birth: profile?.dateOfBirth || profile?.date_of_birth || undefined,
            address1: street, address2: suburb, address3: line3 || undefined, postal_code: postal,
          },
        }),
      });
      const data = await res.json();
      // Surface the exact Experian error so the user can see it (per request).
      const experianError = data?.raw?.error || data?.error;
      if (!res.ok || data?.success !== true) {
        setScoreError(experianError || "Credit check could not be completed.");
        if (/address/i.test(String(experianError || ""))) setAddrPrompt(true);
        return;
      }
      const s = Number(data.creditScore);
      const hasScore = Number.isFinite(s) && s > 0;
      const band = data?.raw?.creditScore?.riskType || data.score_band || bandFor(s);
      const reasons = Array.isArray(data.scoreReasons) ? data.scoreReasons : [];
      setScore(hasScore ? s : null);
      setScoreBand(band);
      setScoreReasons(reasons);
      setCreditDone(true);
      await saveCreditFlag({
        credit_score: hasScore ? s : null,
        credit_score_band: band,
        credit_score_reasons: reasons,
        credit_score_at: new Date().toISOString(),
        credit_requested_amount: loanAmount,
        credit_requested_term: loanTermMonths,
        credit_address: { address1: street, address2: suburb, address3: line3, postal_code: postal },
      });
      // One "application" per completed bureau run — what the user picks from in the marketplace list.
      try {
        const uid = session.user?.id;
        if (uid) {
          await supabase.from("credit_marketplace_applications").insert({
            user_id: uid,
            requested_amount: loanAmount,
            requested_term_months: loanTermMonths,
            status: "in_review",
          });
        }
      } catch (e) {
        console.warn("[CreditFlow] application record failed:", e?.message || e);
      }
    } catch (e) {
      setScoreError(e?.message || "Credit check could not be completed.");
    } finally {
      setBureauRunning(false);
    }
  }, [idOnFile, profile, addr1, addr2, addr3, addrPostal, loanAmount, loanTermMonths, saveCreditFlag, fetchKycAddress]);

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
              {creditDone && scoreReasons.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">What's affecting your score</p>
                  <ul className="mt-1 space-y-1">
                    {scoreReasons.map((r, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-slate-400">
                        <span className="text-slate-300">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scoreError && <p className="mt-3 text-center text-xs font-medium text-red-500">{scoreError}</p>}
              <button
                type="button"
                onClick={runBureau}
                disabled={bureauRunning || addrLookupLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
              >
                {(bureauRunning || addrLookupLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {addrLookupLoading ? "Finding your address…" : bureauRunning ? "Checking your credit…" : creditDone ? "Run again" : "Run credit check"}
              </button>
            </section>

            {/* Address prompt — appears when address is missing or Experian rejects it. */}
            {addrPrompt && (
              <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Confirm your address</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">The credit bureau needs your residential address to run the check.</p>
                <input value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="Street address"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                <input value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Suburb / area"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                <input value={addrPostal} onChange={(e) => setAddrPostal(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Postal code"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-widest text-slate-900 outline-none focus:border-violet-400" />
                <button
                  type="button"
                  onClick={() => {
                    if (!addr1.trim() || !addr2.trim() || !addrPostal.trim()) { setScoreError("Please fill in all address fields."); return; }
                    setScoreError(""); setAddrPrompt(false); runBureau();
                  }}
                  className="mt-4 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white active:scale-[0.99]"
                >
                  Save &amp; continue
                </button>
              </section>
            )}

            {/* Lean loan config — amount + term only. Lenders set the actual rate/terms. */}
            <section className="mt-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">What you're looking for</h3>
              <p className="mt-1 text-xs text-slate-400">We'll match you to lenders for this amount and term.</p>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount</span>
                <div className="mt-2 flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-violet-400">
                  <span className="mr-1 text-base font-semibold text-slate-400">R</span>
                  <input
                    type="text" inputMode="numeric"
                    value={loanAmount ? loanAmount.toLocaleString("en-ZA") : ""}
                    onChange={(e) => { const n = Math.min(50000, Number(e.target.value.replace(/\D/g, "")) || 0); setLoanAmount(n); }}
                    placeholder="0"
                    className="w-full bg-transparent text-xl font-extrabold text-violet-600 outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Up to R 50,000</p>
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Repayment term</span>
                <select
                  value={loanTermMonths}
                  onChange={(e) => setLoanTermMonths(Number(e.target.value))}
                  className="mt-2 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </section>

            {creditDone && (
              <button type="button" onClick={goMarketplace} className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white active:scale-[0.99]">
                See my offers
              </button>
            )}
          </>
        )}

        {/* ── My applications — every completed bureau run, tap one to compare lenders ── */}
        {step === "marketplace" && (
          <>
            <Header title="My applications" />
            {applicationsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <Stub icon={Store} tone="slate" title="No applications yet" body="Run a credit check to start your first application." />
            ) : (
              <ul className="space-y-3">
                {applications.map((app) => {
                  const st = APP_STATUS[app.status] || APP_STATUS.in_review;
                  return (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => openApplication(app)}
                        className="flex w-full items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm active:scale-[0.99]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">R {Number(app.requested_amount || 0).toLocaleString("en-ZA")} · {app.requested_term_months} mo</p>
                          <p className="mt-1 text-xs text-slate-400">{new Date(app.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>
                          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* ── Provider comparison for one application — select up to 5, submit ── */}
        {step === "marketplaceOffers" && activeApplication && (
          <>
            <header className="flex items-center gap-3 mb-6 relative">
              <button type="button" onClick={() => setStep("marketplace")} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold text-slate-900">Credit marketplace</h1>
            </header>

            {/* Score strip */}
            <section className="mb-5 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div>
                <p className="text-3xl font-bold leading-none tracking-tight text-slate-900">{Number.isFinite(score) ? score : "—"}</p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{scoreBand || "Score on file"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">{SCORE_MIN} – {SCORE_MAX}</p>
                <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400" style={{ width: `${Number.isFinite(score) ? Math.min(100, Math.max(0, ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100) ) : 0}%` }} />
                </div>
              </div>
            </section>

            {/* Toolbar */}
            <div className="mb-3 flex items-center gap-2">
              <span className="flex-1 text-xs text-slate-400">Showing <b className="font-semibold text-slate-600">{sortedProviders.length} providers</b></span>
              <button
                type="button"
                onClick={() => setProviderFilterOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${providerFilterOpen ? "border-violet-400 bg-violet-50 text-violet-600" : "border-slate-200 bg-white text-slate-600"}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />Filter
              </button>
              <select
                value={providerSort}
                onChange={(e) => setProviderSort(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 outline-none"
              >
                <option value="rate">Rate ↑</option>
                <option value="limit">Limit ↓</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            {providerFilterOpen && (
              <section className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input type="checkbox" checked={providerEligOnly} onChange={(e) => setProviderEligOnly(e.target.checked)} className="h-3.5 w-3.5 accent-violet-600" />
                  Likely eligible only
                </label>
              </section>
            )}

            {/* Provider list */}
            <div className="space-y-3">
              {sortedProviders.map((p) => {
                const sel = providerSel.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProviderSel(p.id)}
                    className={`block w-full rounded-2xl border bg-white text-left shadow-sm transition ${sel ? "border-violet-500 ring-1 ring-violet-500" : "border-slate-100"}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white" style={{ background: p.bg }}>{p.short}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                            {p.badge && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-600">{p.badge}</span>}
                          </div>
                          <p className="text-xs text-slate-400">{p.type} · {p.term}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                          <div className="text-right">
                            <p className="text-lg font-bold leading-none text-slate-900">{p.rate}%</p>
                            <p className="text-[10px] text-slate-400">p.a. from</p>
                          </div>
                          <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${sel ? "border-violet-600 bg-violet-600" : "border-slate-200"}`}>
                            {sel && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-3">
                        <div>
                          <p className="truncate text-xs font-semibold text-slate-900">{p.limit}</p>
                          <p className="text-[10px] text-slate-400">Max loan</p>
                        </div>
                        <div className="pl-3">
                          <p className="truncate text-xs font-semibold text-slate-900">{p.minIncome}</p>
                          <p className="text-[10px] text-slate-400">Min. income</p>
                        </div>
                        <div className="pl-3">
                          <p className="flex items-center gap-1 text-xs font-semibold text-slate-900">{p.rating}<Star className="h-3 w-3 fill-amber-400 text-amber-400" /></p>
                          <p className="text-[10px] text-slate-400">Rating ({(p.reviews / 1000).toFixed(1)}k)</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                      {p.eligible ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Likely eligible</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">May not qualify</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {providerSubmitted && (
              <p className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />Submitted to {providerSel.size} lender{providerSel.size !== 1 ? "s" : ""}
              </p>
            )}

            {/* Selection tray */}
            {providerSel.size > 0 && !providerSubmitted && (
              <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-sm rounded-t-3xl bg-slate-900 px-5 py-4 shadow-2xl md:max-w-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-white/50"><b className="font-semibold text-white">{providerSel.size}</b> selected</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setProviderSel(new Set())} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60">Clear</button>
                    <button
                      type="button"
                      onClick={submitProviderSelections}
                      disabled={providerSubmitting}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {providerSubmitting ? "Submitting…" : `Submit to ${providerSel.size} →`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default CreditFlow;
