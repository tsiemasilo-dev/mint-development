import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";

/* A biometric selfie/liveness check is far better done on a phone than a desktop
   webcam — and, more importantly, an embedded (iframe) flow runs as a 3rd-party
   context where browsers block the cookies/storage Experian's page needs (seen
   as 401s on its internal completion check). So on desktop we show a QR code the
   user scans to finish on their phone (first-party), while the desktop keeps
   polling and flips to "verified" the moment the phone is done. */
const detectDesktop = () => {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const wide = window.innerWidth >= 1024;
  return !coarsePointer && !hasTouch && wide;
};

const ShieldCheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const AlertCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

const FaceIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
  </svg>
);

const ExternalLinkIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const BeakerIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 2.311l-1.8 3.6a2.25 2.25 0 0 1-2.011 1.239H7.562a2.25 2.25 0 0 1-2.011-1.239l-1.8-3.6A2.25 2.25 0 0 1 4.2 15m15.6 0H4.2" />
  </svg>
);

const LoadingSpinner = ({ size = "md" }) => {
  const cls = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return <div className={`inline-block ${cls} animate-spin rounded-full border-2 border-solid border-current border-r-transparent`} />;
};

const STAGE = {
  INITIALIZING: "initializing",
  READY: "ready",
  MOCK_READY: "mock_ready",
  AWAITING: "awaiting",
  CHECKING: "checking",
  PENDING: "pending",
  VERIFIED: "verified",
  FAILED: "failed",
  ERROR: "error",
};

const ExperianVerification = ({ onVerified }) => {
  const [stage, setStage] = useState(STAGE.INITIALIZING);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const initRef = useRef(false);
  const autoRestartRef = useRef(0); // self-heal a wiped/missing transaction (capped)

  const isDesktop = useMemo(detectDesktop, []);
  // On desktop the user can choose to do it right here (webcam) instead of phone.
  const [useEmbedOnDesktop, setUseEmbedOnDesktop] = useState(false);
  const showQr = isDesktop && !useEmbedOnDesktop;

  // OCR document capture is intentionally NOT part of onboarding. It's been moved
  // to trigger later (on withdrawal or buying a secondary strategy). The OCR
  // machinery (workflow "ocr" in start/collect + the 'ocr' phase below) is kept
  // intact so that flow can reuse it; onboarding runs liveness only.
  // Re-enable for onboarding by flipping this (or setting VITE_EXPERIAN_OCR).
  const OCR_ENABLED = import.meta.env?.VITE_EXPERIAN_OCR === "true";
  const [phase, setPhase] = useState("liveness");
  const phaseRef = useRef("liveness");

  const AUTO_POLL_INTERVAL_MS = 5000;
  const AUTO_POLL_MAX_ATTEMPTS = 180; // ~15 min, then fall back to manual check

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const startWorkflow = useCallback(async (wf, opts = {}) => {
    const workflow = wf || phaseRef.current;
    try {
      setStage(STAGE.INITIALIZING);
      const authToken = await getAuthHeader();
      if (!authToken) {
        setErrorMessage("You must be signed in to continue.");
        setStage(STAGE.ERROR);
        return;
      }

      const res = await fetch("/api/experian/idmn/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ workflow, restart: opts.restart === true }),
      });
      const data = await res.json();

      if (!mountedRef.current) return;

      if (data.success && data.alreadyVerified) {
        // Liveness is already verified. If the OCR document step is still
        // outstanding, route straight into it instead of finishing onboarding —
        // otherwise the user skips OCR and jumps to the next onboarding step.
        if (phaseRef.current === "liveness" && OCR_ENABLED && !data.ocrComplete) {
          phaseRef.current = "ocr";
          setPhase("ocr");
          pollAttemptsRef.current = 0;
          setPollCount(0);
          setErrorMessage("");
          setErrorCode(null);
          setVerificationUrl(null);
          startWorkflow("ocr");
          return;
        }
        setStage(STAGE.VERIFIED);
        if (onVerified) onVerified();
        return;
      }

      if (!data.success) {
        setErrorMessage(data.error?.message || "Failed to start identity verification.");
        setStage(STAGE.ERROR);
        return;
      }

      if (data.mockMode) {
        setIsMockMode(true);
        setStage(STAGE.MOCK_READY);
        return;
      }

      // Always land on READY — never jump straight into AWAITING (which starts
      // the auto-poll). Even when resuming an existing transaction, polling must
      // not begin until the user actively clicks "Start", otherwise an abandoned
      // prior attempt gets polled to a terminal "unsuccessful" the moment the
      // page opens, before the user has done anything.
      setVerificationUrl(data.url);
      setStage(STAGE.READY);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("[ExperianVerification] Start error:", err);
      setErrorMessage(err.message || "Failed to connect to verification service.");
      setStage(STAGE.ERROR);
    }
  }, [getAuthHeader, onVerified]);

  useEffect(() => {
    mountedRef.current = true;
    if (!initRef.current) {
      initRef.current = true;
      startWorkflow();
    }
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [startWorkflow]);

  // Reveal the Experian page embedded in an iframe (stays in-app).
  const beginVerification = () => {
    if (verificationUrl) {
      pollAttemptsRef.current = 0;
      setStage(STAGE.AWAITING);
    }
  };

  // Fallback when the iframe is blocked or the user prefers a full page.
  const openInNewTab = () => {
    if (verificationUrl) window.open(verificationUrl, "_blank", "noopener,noreferrer");
  };

  // silent = background auto-poll: don't flip the UI to "checking" or surface
  // transient errors; only act on a final verified/failed outcome.
  const collectResults = useCallback(async (silent = false) => {
    try {
      if (!silent) setStage(STAGE.CHECKING);
      const authToken = await getAuthHeader();
      if (!authToken) {
        if (silent) return;
        setErrorMessage("Session expired. Please refresh.");
        setStage(STAGE.ERROR);
        return;
      }

      const res = await fetch("/api/experian/idmn/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ workflow: phaseRef.current }),
      });
      const data = await res.json();

      // Surface the raw Experian payload in the browser console so OCR/liveness
      // fields (and any image data) can be inspected without Vercel log access.
      if (data?.collectResult) {
        const wfLabel = (data.workflow || phaseRef.current || "?").toUpperCase();
        try {
          console.log(`[Experian ${wfLabel}] CollectWorkflowResults raw:`, JSON.stringify(data.collectResult, null, 2));
          console.log(`[Experian ${wfLabel}] top-level keys:`, Object.keys(data.collectResult || {}));
        } catch {
          console.log(`[Experian ${wfLabel}] CollectWorkflowResults raw:`, data.collectResult);
        }
      }

      if (!mountedRef.current) return;

      if (!data.success) {
        // The transaction went missing (wiped/torn write/expired). Don't 400-loop
        // — issue ONE fresh StartWorkflow so the user can continue, then stop
        // auto-restarting to avoid a loop if the backend keeps failing.
        if (data.error?.code === "NO_TRANSACTION" && autoRestartRef.current < 1) {
          autoRestartRef.current += 1;
          console.warn("[ExperianVerification] No transaction on collect — restarting verification fresh.");
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          pollAttemptsRef.current = 0;
          setPollCount(0);
          startWorkflow(phaseRef.current, { restart: true });
          return;
        }
        if (silent) return; // ignore transient failures during auto-poll
        setErrorMessage(data.error?.message || "Failed to retrieve verification result.");
        setStage(STAGE.ERROR);
        return;
      }

      // A good poll means the transaction is alive again — re-arm the self-heal.
      if (data.status === "verified" || data.status === "in_progress" || data.status === "pending") {
        autoRestartRef.current = 0;
      }

      if (data.status === "verified") {
        // Liveness passed → kick off the OCR document step in the same UI. OCR
        // passed (or disabled) → finish and advance onboarding.
        if (phaseRef.current === "liveness" && OCR_ENABLED) {
          phaseRef.current = "ocr";
          setPhase("ocr");
          pollAttemptsRef.current = 0;
          setPollCount(0);
          setErrorMessage("");
          setErrorCode(null);
          setVerificationUrl(null);
          setStage(STAGE.INITIALIZING);
          startWorkflow("ocr");
          return;
        }
        setStage(STAGE.VERIFIED);
        if (onVerified) onVerified();
      } else if (data.status === "failed" || data.status === "not_verified") {
        // Never fail during a background auto-poll: a not-yet-completed (or
        // 401-affected) transaction reports failure-like results before the user
        // has even scanned/finished. Keep waiting; a real failure is only shown
        // when the user explicitly checks status.
        if (silent) return;
        setErrorCode(data.errorCode);
        setErrorMessage("Verification was unsuccessful. Please try again.");
        setStage(STAGE.FAILED);
      } else if (data.status === "pending" || data.status === "in_progress") {
        setErrorCode(null);
        setPollCount((c) => c + 1);
        // Still in progress — the user hasn't finished the workflow yet. Silent
        // poll: stay on the embedded iframe (AWAITING). Manual check: show the
        // dedicated "in progress" screen.
        if (!silent) setStage(STAGE.PENDING);
      } else if (!silent) {
        setStage(STAGE.AWAITING);
      }
    } catch (err) {
      if (silent) return; // ignore transient network errors during auto-poll
      if (!mountedRef.current) return;
      console.error("[ExperianVerification] Collect error:", err);
      setErrorMessage(err.message || "Failed to retrieve results.");
      setStage(STAGE.ERROR);
    }
  }, [getAuthHeader, onVerified, startWorkflow, OCR_ENABLED]);

  // After liveness, OCR is a nice-to-have document capture — never let an OCR
  // problem (e.g. workflow not provisioned) trap a user whose KYC already passed.
  const skipOcr = () => { if (onVerified) onVerified(); };

  // Auto-poll while the embedded verification (iframe) is open, so the step
  // advances on its own the moment Experian confirms — no manual "check" click.
  // NOTE: declared AFTER collectResults — referencing it in the dependency array
  // before its useCallback initialization triggers a "Cannot access before
  // initialization" (TDZ) crash during render.
  useEffect(() => {
    if (stage !== STAGE.AWAITING) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || !mountedRef.current) return;
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > AUTO_POLL_MAX_ATTEMPTS) {
        // Give up auto-polling; fall back to the manual "check status" screen.
        setStage(STAGE.PENDING);
        return;
      }
      await collectResults(true);
      if (!cancelled && mountedRef.current) {
        pollTimerRef.current = setTimeout(tick, AUTO_POLL_INTERVAL_MS);
      }
    };
    pollTimerRef.current = setTimeout(tick, AUTO_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [stage, collectResults]);

  // Re-check the instant the user returns to this tab/window. Critical for the
  // QR (phone) flow: while the user is on their phone, this tab is backgrounded
  // and the browser throttles/freezes the poll timer above — so the phone can
  // finish without the laptop noticing. Checking on focus/visibility catches it.
  useEffect(() => {
    if (stage !== STAGE.AWAITING) return undefined;
    const recheck = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        pollAttemptsRef.current = 0; // we're active again; reset the give-up clock
        collectResults(true);
      }
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [stage, collectResults]);

  // QR/phone flow: an explicit "I've finished on my phone" check. Uses the silent
  // path so a not-yet-propagated result can't throw a false "unsuccessful" — it
  // either advances (verified) or shows a gentle "not yet" note.
  const [phoneCheckMsg, setPhoneCheckMsg] = useState("");
  const checkPhoneDone = useCallback(async () => {
    setPhoneCheckMsg("Checking…");
    await collectResults(true);
    if (mountedRef.current) {
      setPhoneCheckMsg("Not confirmed yet — give it a few seconds, then try again.");
    }
  }, [collectResults]);

  const handleRetry = () => {
    setErrorMessage("");
    setErrorCode(null);
    setVerificationUrl(null);
    setIsMockMode(false);
    initRef.current = false;
    startWorkflow();
  };

  // "Redo" — discard the current Experian transaction and request a brand-new
  // one (restart:true), then drop straight back into the embedded flow.
  const startOver = useCallback(async () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollAttemptsRef.current = 0;
    setErrorMessage("");
    setErrorCode(null);
    setVerificationUrl(null);
    setStage(STAGE.INITIALIZING);
    try {
      const authToken = await getAuthHeader();
      if (!authToken) { setErrorMessage("You must be signed in to continue."); setStage(STAGE.ERROR); return; }
      const res = await fetch("/api/experian/idmn/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ restart: true, workflow: phaseRef.current }),
      });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (!data.success) { setErrorMessage(data.error?.message || "Failed to restart verification."); setStage(STAGE.ERROR); return; }
      if (data.mockMode) { setIsMockMode(true); setStage(STAGE.MOCK_READY); return; }
      setVerificationUrl(data.url);
      pollAttemptsRef.current = 0;
      setStage(STAGE.AWAITING);
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(err.message || "Failed to restart verification.");
      setStage(STAGE.ERROR);
    }
  }, [getAuthHeader]);

  const ocrPhase = phase === "ocr";
  const stepBadge = ocrPhase ? "Step 2 of 2 · ID document" : "Step 1 of 2 · Liveness";

  if (stage === STAGE.INITIALIZING) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Setting Up Verification</h3>
        <p className="text-sm text-slate-500">Preparing your identity check…</p>
      </div>
    );
  }

  // ── Desktop: scan a QR code to finish on your phone (keeps polling here) ───
  if (stage === STAGE.AWAITING && showQr) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600 mb-1">{stepBadge}</p>
          <h3 className="text-lg font-medium text-slate-800 mb-1">Continue on your phone</h3>
          <p className="text-sm text-slate-500">
            {ocrPhase
              ? "Photographing your ID works best on a phone camera. Scan this code to capture your ID document — this page updates automatically when you're done."
              : "A selfie & liveness check works best on a phone camera. Scan this code with your phone to complete it — this page will update automatically when you're done."}
          </p>
        </div>

        <div className="inline-flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          {verificationUrl ? (
            <QRCodeSVG value={verificationUrl} size={208} level="M" includeMargin />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center"><LoadingSpinner /></div>
          )}
          <p className="text-xs text-slate-400 max-w-[13rem]">
            Open your phone camera and point it at the code
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LoadingSpinner size="sm" />
          <span>Waiting for you to finish on your phone…</span>
        </div>

        <button
          type="button"
          onClick={checkPhoneDone}
          className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <CheckCircleIcon className="w-4 h-4" />
          I've finished on my phone
        </button>
        {phoneCheckMsg && <p className="text-xs text-slate-500 mt-2">{phoneCheckMsg}</p>}

        <p className="text-xs text-center text-slate-400 mt-4">
          <button type="button" onClick={() => setUseEmbedOnDesktop(true)} className="text-violet-600 underline font-medium">
            Use this computer's camera instead
          </button>
          {"  ·  "}
          <button type="button" onClick={startOver} className="text-violet-600 underline font-medium">
            Start over
          </button>
        </p>
      </div>
    );
  }

  // ── Embedded verification (iframe) + automatic polling ────────────────────
  if (stage === STAGE.AWAITING) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600 mb-1">{stepBadge}</p>
          <h3 className="text-lg font-medium text-slate-800 mb-1">{ocrPhase ? "Capture Your ID Document" : "Biometric Identity Check"}</h3>
          <p className="text-sm text-slate-500">
            {ocrPhase
              ? "Photograph your ID document below — we'll confirm automatically when you're done."
              : "Take a selfie and complete the liveness check below — we'll confirm automatically when you're done."}
          </p>
        </div>

        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
          style={{ height: "70vh", minHeight: 480 }}
        >
          {verificationUrl && (
            <iframe
              src={verificationUrl}
              title="Experian Identity Verification"
              allow="camera; microphone; fullscreen"
              className="w-full h-full"
              style={{ border: 0 }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LoadingSpinner size="sm" />
          <span>Waiting for confirmation… this updates automatically.</span>
        </div>

        <p className="text-xs text-center text-slate-400 mt-2">
          Page not loading?{" "}
          <button type="button" onClick={openInNewTab} className="text-violet-600 underline font-medium">
            Open in a new tab
          </button>
          {isDesktop && (
            <>
              {"  ·  "}
              <button type="button" onClick={() => setUseEmbedOnDesktop(false)} className="text-violet-600 underline font-medium">
                Use my phone instead
              </button>
            </>
          )}
          {"  ·  "}
          <button type="button" onClick={startOver} className="text-violet-600 underline font-medium">
            Start over
          </button>
        </p>
      </div>
    );
  }

  if (stage === STAGE.VERIFIED) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Identity Verified</h3>
        <p className="text-sm text-slate-500">Your identity has been successfully verified.</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Verification Complete</span>
        </div>
        {isMockMode && (
          <p className="text-xs text-amber-600 mt-3 flex items-center justify-center gap-1">
            <BeakerIcon className="w-3 h-3" />
            Test mode — no real Experian check was performed
          </p>
        )}
      </div>
    );
  }

  if (stage === STAGE.CHECKING) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
          <ShieldCheckIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Checking Your Verification</h3>
        <p className="text-sm text-slate-500">
          {isMockMode ? "Simulating verification result…" : "Retrieving your biometric verification result…"}
        </p>
      </div>
    );
  }

  if (stage === STAGE.PENDING) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center animate-pulse">
          <ShieldCheckIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Verification In Progress</h3>
        <p className="text-sm text-slate-500 mb-2">Your biometric check is still being processed.</p>
        <p className="text-xs text-slate-400 mb-6">
          If you haven't completed the verification page yet, please do so and come back.
        </p>
        <div className="flex flex-col gap-3">
          {verificationUrl && (
            <button
              type="button"
              onClick={() => setStage(STAGE.AWAITING)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white border border-violet-400"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
            >
              <ShieldCheckIcon className="w-4 h-4" />
              Resume Verification
            </button>
          )}
          <button
            type="button"
            onClick={() => collectResults(false)}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Check Status Again
          </button>
          <button
            type="button"
            onClick={startOver}
            className="px-5 py-2 rounded-xl font-medium text-slate-500 hover:text-violet-600 transition-colors text-sm"
          >
            Didn't complete it? Redo the check
          </button>
        </div>
        {pollCount > 0 && (
          <p className="text-xs text-slate-400 mt-4">Checked {pollCount} time{pollCount !== 1 ? "s" : ""}</p>
        )}
      </div>
    );
  }

  if (stage === STAGE.FAILED) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
          <AlertCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Verification Unsuccessful</h3>
        <p className="text-sm text-slate-500 mb-4">{errorMessage || "Your biometric verification could not be completed."}</p>
        {errorCode && <p className="text-xs text-slate-400 mb-4">Reference: {errorCode}</p>}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.open("mailto:support@mintinvest.co.za", "_blank")}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Contact Support
          </button>
          {ocrPhase && (
            <button
              type="button"
              onClick={skipOcr}
              className="px-6 py-2 rounded-xl font-medium text-slate-500 hover:text-violet-600 transition-colors text-sm"
            >
              Skip document scan &amp; continue
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === STAGE.ERROR) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <AlertCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Something Went Wrong</h3>
        <p className="text-sm text-slate-500 mb-6">{errorMessage || "Could not connect to the verification service."}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
          >
            Try Again
          </button>
          {ocrPhase && (
            <button
              type="button"
              onClick={skipOcr}
              className="px-6 py-2 rounded-xl font-medium text-slate-500 hover:text-violet-600 transition-colors text-sm"
            >
              Skip document scan &amp; continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Mock mode ready ───────────────────────────────────────────────────────
  if (stage === STAGE.MOCK_READY) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
          <BeakerIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Test mode — Experian credentials not configured</p>
        </div>

        <div className="mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FaceIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Biometric Identity Check</h3>
          <p className="text-sm text-slate-500">
            In production, you'd be redirected to Experian to complete a selfie and liveness check. In test mode, click below to simulate a successful verification.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-6">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Production flow</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">1</span>
              Redirected to a secure Experian verification page
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">2</span>
              Take a selfie and complete a short liveness check
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">3</span>
              Return here — Experian confirms your identity
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => collectResults(false)}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <BeakerIcon className="w-5 h-5" />
          Simulate Verification (Test Mode)
        </button>

        <p className="text-xs text-center text-slate-400 mt-4">
          This button only appears when Experian credentials are not configured
        </p>
      </div>
    );
  }

  // ── Real mode ready ───────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <FaceIcon className="w-8 h-8 text-white" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600 mb-1">{stepBadge}</p>
        <h3 className="text-lg font-medium text-slate-800 mb-2">{ocrPhase ? "Capture Your ID Document" : "Biometric Identity Check"}</h3>
        <p className="text-sm text-slate-500">
          {ocrPhase
            ? (showQr
                ? "Last step — scan the QR code to photograph your ID document on your phone."
                : "Last step — photograph your ID document. We'll read it and match it to your verified identity.")
            : (showQr
                ? "A selfie & liveness check works best on a phone. You'll scan a QR code to finish on your phone — this verifies your identity against Home Affairs records."
                : "Complete a quick selfie and liveness check, right here in the app. This verifies your identity against Home Affairs records.")}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-6">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">What to expect</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">1</span>
            {showQr ? "A QR code appears — scan it with your phone" : "A secure Experian verification panel opens below"}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">2</span>
            {showQr ? "On your phone, take a selfie and complete a short liveness check" : "Allow camera access, take a selfie and complete a short liveness check"}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">3</span>
            {showQr ? "This page confirms automatically when your phone is done" : "We confirm automatically — no need to leave this page"}
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={beginVerification}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <FaceIcon className="w-5 h-5" />
          {ocrPhase
            ? (showQr ? "Scan ID on My Phone" : "Capture ID Document")
            : (showQr ? "Continue on My Phone" : "Start Biometric Verification")}
        </button>
        {isDesktop && (
          <button
            type="button"
            onClick={() => { setUseEmbedOnDesktop((v) => !v); }}
            className="w-full text-xs text-slate-400 hover:text-violet-600 transition-colors"
          >
            {showQr ? "Or use this computer's camera instead" : "Or scan a QR code to use your phone"}
          </button>
        )}
      </div>

      <p className="text-xs text-center text-slate-400 mt-4">
        Powered by <span className="font-medium">Experian</span> — your data is encrypted and secure
      </p>
    </div>
  );
};

export default ExperianVerification;
