import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

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

const LoadingSpinner = ({ size = "md" }) => {
  const cls = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return <div className={`inline-block ${cls} animate-spin rounded-full border-2 border-solid border-current border-r-transparent`} />;
};

const STAGE = {
  INITIALIZING: "initializing",
  READY: "ready",
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
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const initRef = useRef(false);

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const startWorkflow = useCallback(async () => {
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
      });
      const data = await res.json();

      if (!mountedRef.current) return;

      if (data.success && data.alreadyVerified) {
        setStage(STAGE.VERIFIED);
        if (onVerified) onVerified();
        return;
      }

      if (!data.success) {
        setErrorMessage(data.error?.message || "Failed to start identity verification.");
        setStage(STAGE.ERROR);
        return;
      }

      setVerificationUrl(data.url);
      setStage(data.existing ? STAGE.AWAITING : STAGE.READY);
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

  const openVerificationUrl = () => {
    if (verificationUrl) {
      window.open(verificationUrl, "_blank", "noopener,noreferrer");
      setStage(STAGE.AWAITING);
    }
  };

  const collectResults = useCallback(async () => {
    try {
      setStage(STAGE.CHECKING);
      const authToken = await getAuthHeader();
      if (!authToken) {
        setErrorMessage("Session expired. Please refresh.");
        setStage(STAGE.ERROR);
        return;
      }

      const res = await fetch("/api/experian/idmn/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
      });
      const data = await res.json();

      if (!mountedRef.current) return;

      if (!data.success) {
        setErrorMessage(data.error?.message || "Failed to retrieve verification result.");
        setStage(STAGE.ERROR);
        return;
      }

      if (data.status === "verified") {
        setStage(STAGE.VERIFIED);
        if (onVerified) onVerified();
      } else if (data.status === "pending") {
        setErrorCode(null);
        setStage(STAGE.PENDING);
        setPollCount((c) => c + 1);
      } else if (data.status === "failed") {
        setErrorCode(data.errorCode);
        setErrorMessage("Verification was unsuccessful. Please try again.");
        setStage(STAGE.FAILED);
      } else {
        setStage(STAGE.AWAITING);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("[ExperianVerification] Collect error:", err);
      setErrorMessage(err.message || "Failed to retrieve results.");
      setStage(STAGE.ERROR);
    }
  }, [getAuthHeader, onVerified]);

  const handleRetry = () => {
    setErrorMessage("");
    setErrorCode(null);
    setVerificationUrl(null);
    initRef.current = false;
    startWorkflow();
  };

  if (stage === STAGE.INITIALIZING) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Setting Up Verification</h3>
        <p className="text-sm text-slate-500">Preparing your identity check with Experian…</p>
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
        <p className="text-sm text-slate-500">Your identity has been successfully verified by Experian.</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Verification Complete</span>
        </div>
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
        <p className="text-sm text-slate-500">Retrieving your biometric verification result…</p>
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
        <p className="text-sm text-slate-500 mb-2">
          Your biometric check is still being processed by Experian.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          This may take a moment. If you haven't completed the verification page yet, please do so and come back.
        </p>
        <div className="flex flex-col gap-3">
          {verificationUrl && (
            <button
              type="button"
              onClick={openVerificationUrl}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white border border-violet-400"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
            >
              <ExternalLinkIcon className="w-4 h-4" />
              Re-open Verification Page
            </button>
          )}
          <button
            type="button"
            onClick={collectResults}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Check Status Again
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
        <button
          type="button"
          onClick={handleRetry}
          className="px-6 py-2.5 rounded-xl font-medium text-white transition-all"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <FaceIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Biometric Identity Check</h3>
        <p className="text-sm text-slate-500">
          You'll be taken to a secure Experian page to complete a quick selfie and liveness check. This verifies your identity against Home Affairs records.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-6">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">What to expect</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">1</span>
            You'll be redirected to a secure Experian verification page
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">2</span>
            Take a selfie and complete a short liveness check
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">3</span>
            Return here and confirm once you're done
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={openVerificationUrl}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
        >
          <ExternalLinkIcon className="w-5 h-5" />
          Start Biometric Verification
        </button>

        {stage === STAGE.AWAITING && (
          <button
            type="button"
            onClick={collectResults}
            className="w-full px-5 py-3 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            I've completed the verification ✓
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
