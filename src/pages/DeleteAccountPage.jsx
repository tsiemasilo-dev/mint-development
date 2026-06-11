import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, ChevronRight, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

const REASONS = [
  { value: "fees", label: "Fees are too high" },
  { value: "moving_platform", label: "I'm moving to another platform" },
  { value: "no_longer_needed", label: "I no longer need the service" },
  { value: "technical_issues", label: "I'm having technical issues" },
  { value: "taking_a_break", label: "I want to take a break" },
  { value: "other", label: "Other" },
];

const DeleteAccountPage = ({ onBack, onNavigate, onLogout }) => {
  const [step, setStep] = useState("checking");
  const [blockers, setBlockers] = useState([]);
  const [children, setChildren] = useState([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [confirmText, setConfirmText] = useState("");

  const [closingChildId, setClosingChildId] = useState(null);
  const [childConfirmName, setChildConfirmName] = useState("");
  const [childConfirmError, setChildConfirmError] = useState("");
  const [childClosing, setChildClosing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchBlockers = useCallback(async () => {
    setStep("checking");
    setLoadError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setLoadError("Session expired. Please log in again.");
        setStep("error");
        return;
      }
      const res = await fetch("/api/account/delete", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Failed to load account status.");
        setStep("error");
        return;
      }
      setBlockers(data.blockers || []);
      setChildren(data.children || []);
      setCanDelete(data.canDelete);
      setStep(data.canDelete ? "reason" : "blockers");
    } catch (e) {
      setLoadError("Could not connect. Please try again.");
      setStep("error");
    }
  }, []);

  useEffect(() => {
    fetchBlockers();
  }, [fetchBlockers]);

  const handleCloseChild = async (child) => {
    if (childConfirmName.trim().toLowerCase() !== child.first_name.trim().toLowerCase()) {
      setChildConfirmError(`Please type "${child.first_name}" exactly to confirm`);
      return;
    }
    setChildClosing(true);
    setChildConfirmError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      const token = session?.access_token;
      const res = await fetch("/api/family-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_id: child.id, primary_user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChildConfirmError(data.error || "Failed to close child account.");
        setChildClosing(false);
        return;
      }
      setClosingChildId(null);
      setChildConfirmName("");
      await fetchBlockers();
    } catch (e) {
      setChildConfirmError("Something went wrong. Please try again.");
    }
    setChildClosing(false);
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    if (!password.trim()) {
      setPasswordError("Please enter your password");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password, reason, reason_other: reasonOther }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Incorrect password.");
        setSubmitting(false);
        return;
      }
      setStep("confirm");
    } catch (e) {
      setPasswordError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handleFinalDelete = async () => {
    if (confirmText !== "DELETE") return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await supabase.auth.signOut();
      setStep("done");
      if (onLogout) onLogout();
    } catch (e) {
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const childBlockerInfo = blockers.find(b => b.type === "children");
  const nonChildBlockers = blockers.filter(b => b.type !== "children");

  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <Trash2 className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Account Closure Requested</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
          Your closure request has been received. As required by FICA, your financial records will be retained for 5 years. You have been signed out.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <header className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Close Account</h1>
      </header>

      {step === "checking" && (
        <div className="flex flex-col items-center justify-center pt-24 gap-4">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
          <p className="text-slate-500 text-sm">Checking your account status…</p>
        </div>
      )}

      {step === "error" && (
        <div className="rounded-2xl bg-red-50 p-5 text-center">
          <p className="text-red-700 text-sm font-medium mb-3">{loadError}</p>
          <button
            onClick={fetchBlockers}
            className="text-sm font-semibold text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {step === "blockers" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Action required before closing</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                The following must be resolved before your account can be closed. South African FICA regulations require all funds and investments to be settled first.
              </p>
            </div>
          </div>

          {childBlockerInfo && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-slate-400 px-1">Child Accounts</p>
              {children.map((child) => (
                <div key={child.id} className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Child account</p>
                    </div>
                    {child.canClose ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Ready to close</span>
                    ) : (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">Needs action</span>
                    )}
                  </div>

                  {child.blockers.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 leading-relaxed">{b.message}</p>
                    </div>
                  ))}

                  {child.canClose && closingChildId !== child.id && (
                    <button
                      onClick={() => {
                        setClosingChildId(child.id);
                        setChildConfirmName("");
                        setChildConfirmError("");
                      }}
                      className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition active:scale-[0.99]"
                    >
                      Close {child.first_name}'s account
                    </button>
                  )}

                  {child.canClose && closingChildId === child.id && (
                    <div className="space-y-3 bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Type <span className="font-bold text-slate-800">{child.first_name}</span> to confirm closing this account. This cannot be undone.
                      </p>
                      <input
                        type="text"
                        value={childConfirmName}
                        onChange={e => { setChildConfirmName(e.target.value); setChildConfirmError(""); }}
                        placeholder={child.first_name}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      {childConfirmError && (
                        <p className="text-xs text-red-500">{childConfirmError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setClosingChildId(null); setChildConfirmName(""); setChildConfirmError(""); }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCloseChild(child)}
                          disabled={childClosing || childConfirmName.trim().toLowerCase() !== child.first_name.trim().toLowerCase()}
                          className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                        >
                          {childClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Confirm close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {nonChildBlockers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-slate-400 px-1">Your Account</p>
              {nonChildBlockers.map((b, i) => (
                <div key={i} className="rounded-2xl bg-white p-4 shadow-sm flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 leading-relaxed">{b.message}</p>
                    {b.type === "wallet" && (
                      <button
                        onClick={() => onNavigate?.("transact")}
                        className="mt-2 text-xs font-semibold text-violet-600 flex items-center gap-1"
                      >
                        Go to wallet <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                    {b.type === "holdings" && (
                      <button
                        onClick={() => onNavigate?.("investments")}
                        className="mt-2 text-xs font-semibold text-violet-600 flex items-center gap-1"
                      >
                        View investments <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={fetchBlockers}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 shadow-sm transition active:scale-[0.99]"
          >
            Refresh status
          </button>
        </div>
      )}

      {step === "reason" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-green-700">Account is clear</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              No active investments, no wallet balance, no pending transactions. You may proceed.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Step 1 of 3 — Why are you leaving?</p>
            <div className="space-y-2">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => { setReason(r.value); if (r.value !== "other") setReasonOther(""); }}
                  className={`w-full rounded-2xl p-4 text-left transition flex items-center gap-3 shadow-sm ${
                    reason === r.value
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-800"
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    reason === r.value ? "border-white bg-white" : "border-slate-300"
                  }`}>
                    {reason === r.value && <span className="h-2.5 w-2.5 rounded-full bg-violet-600 block" />}
                  </span>
                  <span className="text-sm font-medium">{r.label}</span>
                </button>
              ))}
            </div>

            {reason === "other" && (
              <textarea
                value={reasonOther}
                onChange={e => setReasonOther(e.target.value)}
                placeholder="Please tell us more…"
                rows={3}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
              />
            )}
          </div>

          <button
            onClick={() => setStep("password")}
            disabled={!reason || (reason === "other" && !reasonOther.trim())}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white disabled:opacity-40 transition active:scale-[0.99]"
          >
            Continue
          </button>
        </div>
      )}

      {step === "password" && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Step 2 of 3 — Confirm your identity</p>
            <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Enter your Mint password to verify it's really you before we process this request.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
                  placeholder="Your current password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl border px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    passwordError ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-violet-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            </div>
          </div>

          <button
            onClick={handlePasswordSubmit}
            disabled={submitting || !password.trim()}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white disabled:opacity-40 transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify & Continue
          </button>

          <button
            onClick={() => setStep("reason")}
            className="w-full text-center text-sm text-slate-500"
          >
            ← Back
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-bold text-red-800">This action is permanent</p>
            </div>
            <ul className="text-xs text-red-700 leading-relaxed space-y-1 pl-7 list-disc">
              <li>Your account will be marked for closure immediately</li>
              <li>You will be signed out and unable to log back in</li>
              <li>Transaction records are retained for 5 years (FICA compliance)</li>
              <li>Contact support within 30 days if you change your mind</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Step 3 of 3 — Final confirmation</p>
            <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                Type <span className="font-bold text-slate-900">DELETE</span> below to permanently close your account.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => { setConfirmText(e.target.value); setSubmitError(""); }}
                placeholder="Type DELETE here"
                autoCapitalize="characters"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 font-mono tracking-widest"
              />
              {submitError && <p className="text-xs text-red-500">{submitError}</p>}
            </div>
          </div>

          <button
            onClick={handleFinalDelete}
            disabled={submitting || confirmText !== "DELETE"}
            className="w-full rounded-2xl bg-red-500 py-4 text-sm font-semibold text-white disabled:opacity-40 transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Close My Account
          </button>

          <button
            onClick={() => { setStep("password"); setConfirmText(""); setSubmitError(""); }}
            className="w-full text-center text-sm text-slate-500"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountPage;
