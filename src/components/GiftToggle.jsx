import React, { useState } from "react";
import { Gift, AlertCircle, RefreshCw, Wallet } from "lucide-react";

export default function GiftToggle({
  enabled,
  onToggle,
  recipientInfo = {},
  onInfoChange,
  minAmount,
  assetName,
  amountDisplay,
  showConfirm,
  onConfirm,
  onCancelConfirm,
  onRequestOtp,
  onSubmit,
}) {
  const [firstName, setFirstName] = useState(recipientInfo.firstName || "");
  const [lastName, setLastName] = useState(recipientInfo.lastName || "");
  const [identifier, setIdentifier] = useState(recipientInfo.identifier || "");
  const [message, setMessage] = useState(recipientInfo.message || "");

  const [otpStep, setOtpStep] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(null);

  function handleFirstNameChange(val) {
    setFirstName(val);
    onInfoChange?.({ firstName: val, lastName, identifier, message });
  }

  function handleLastNameChange(val) {
    setLastName(val);
    onInfoChange?.({ firstName, lastName: val, identifier, message });
  }

  function handleIdentifierChange(val) {
    setIdentifier(val);
    onInfoChange?.({ firstName, lastName, identifier: val, message });
  }

  function handleMessageChange(val) {
    setMessage(val);
    onInfoChange?.({ firstName, lastName, identifier, message: val });
  }

  function handleCancelConfirm() {
    setOtpStep(null);
    setOtpCode("");
    setOtpError(null);
    onCancelConfirm?.();
  }

  async function handleRequestOtp() {
    setOtpStep("requesting");
    setOtpError(null);
    setOtpCode("");
    try {
      const result = await onRequestOtp?.();
      if (result?.error) {
        setOtpError(result.error);
        setOtpStep("error");
      } else {
        setOtpStep("input");
      }
    } catch (e) {
      setOtpError("Could not send verification code. Please try again.");
      setOtpStep("error");
    }
  }

  async function handleVerifyOtp() {
    const code = otpCode.trim();
    if (code.length !== 6) { setOtpError("Please enter the 6-digit code."); return; }
    setOtpStep("verifying");
    setOtpError(null);
    const result = await onConfirm?.(code);
    if (result?.error) {
      setOtpError(result.error);
      setOtpStep("input");
    }
  }

  function handleToggle(val) {
    setOtpStep(null);
    setOtpCode("");
    setOtpError(null);
    onToggle?.(val);
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => handleToggle(!enabled)}
        className="w-full flex items-center justify-between bg-violet-50 hover:bg-violet-100 transition-colors rounded-2xl px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Gift size={16} className="text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Send as a gift</p>
            <p className="text-xs text-slate-500">
              {minAmount ? `Min. R${(minAmount / 100).toFixed(0)} · ` : ""}Full FICA required to claim
            </p>
          </div>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${enabled ? "bg-violet-600" : "bg-slate-200"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      {enabled && !showConfirm && (
        <div className="mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Wallet size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Gift amount is deducted directly from your wallet. If your balance is insufficient, please deposit funds via EFT before sending.
          </p>
        </div>
      )}

      {enabled && !showConfirm && (
        <div className="mt-3 space-y-3 bg-slate-50 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">First Name <span className="text-red-500">*</span></label>
              <input type="text" value={firstName} onChange={(e) => handleFirstNameChange(e.target.value)} placeholder="John"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Last Name <span className="text-red-500">*</span></label>
              <input type="text" value={lastName} onChange={(e) => handleLastNameChange(e.target.value)} placeholder="Doe"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Recipient email <span className="text-red-500">*</span></label>
            <input type="email" value={identifier} onChange={(e) => handleIdentifierChange(e.target.value)} placeholder="recipient@email.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Personal message <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={message} onChange={(e) => handleMessageChange(e.target.value)} placeholder="Add a personal note…" rows={2} maxLength={200}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">FICA Verification Required</p>
            <p className="text-xs text-red-600 leading-relaxed">
              The recipient must complete FICA identity verification before they can claim this gift.
              They will not be able to access the funds without a verified Mint account.
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {assetName ? `Your ${assetName} investment will be held securely until the recipient claims it. ` : "The investment will be held securely until the recipient claims it. "}
            If unclaimed after 30 days, it's automatically refunded to your wallet.
          </p>
          {onSubmit && (
            <button type="button" onClick={onSubmit} disabled={!identifier.trim() || !firstName.trim() || !lastName.trim()}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-95 ${identifier.trim() && firstName.trim() && lastName.trim() ? "bg-violet-600" : "bg-slate-300 cursor-not-allowed"}`}>
              <Gift size={16} /> Send as Gift
            </button>
          )}
        </div>
      )}

      {enabled && showConfirm && otpStep === null && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Confirm recipient</p>
              <p className="text-xs text-slate-500">Please double-check before sending — gifts are deducted immediately and can't be changed.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Sending to</span><span className="font-semibold text-slate-900 break-all text-right max-w-[60%]">{recipientInfo.identifier || identifier}</span></div>
            {amountDisplay && <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Amount</span><span className="font-semibold text-violet-700">{amountDisplay}</span></div>}
            {assetName && <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Asset</span><span className="font-semibold text-slate-900">{assetName}</span></div>}
            {(recipientInfo.message || message) && <div className="pt-1 border-t border-slate-100"><span className="text-slate-500 text-xs block mb-1">Message</span><span className="text-slate-700 text-xs italic">"{recipientInfo.message || message}"</span></div>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCancelConfirm} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 active:scale-95 transition-all">Edit</button>
            <button type="button" onClick={handleRequestOtp} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white active:scale-95 transition-all">Continue</button>
          </div>
        </div>
      )}

      {enabled && showConfirm && otpStep === "requesting" && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
          <p className="text-sm text-slate-600">Sending verification code…</p>
        </div>
      )}

      {enabled && showConfirm && otpStep === "error" && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">Couldn't send verification code</p>
          <p className="text-xs text-red-600">{otpError}</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCancelConfirm} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={handleRequestOtp} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white">Try Again</button>
          </div>
        </div>
      )}

      {enabled && showConfirm && (otpStep === "input" || otpStep === "verifying") && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Verify it's you</p>
              <p className="text-xs text-slate-500">We sent a 6-digit code to your email. Enter it below to confirm the gift.</p>
            </div>
          </div>
          <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
            onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); setOtpError(null); }}
            placeholder="000000" autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-300" />
          {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleCancelConfirm} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 active:scale-95 transition-all">Cancel</button>
            <button type="button" onClick={handleVerifyOtp} disabled={otpStep === "verifying" || otpCode.length !== 6}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white active:scale-95 transition-all ${otpStep === "verifying" || otpCode.length !== 6 ? "bg-slate-300 cursor-not-allowed" : "bg-violet-600"}`}>
              {otpStep === "verifying" ? "Verifying…" : "Confirm & Send"}
            </button>
          </div>
          <button type="button" onClick={handleRequestOtp} disabled={otpStep === "requesting"} className="w-full flex items-center justify-center gap-1.5 text-xs text-violet-600 py-1">
            <RefreshCw size={12} /> Resend code
          </button>
        </div>
      )}
    </div>
  );
}
