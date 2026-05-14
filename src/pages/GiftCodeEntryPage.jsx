import React, { useState } from "react";
import { ArrowLeft, ShieldAlert, UserPlus } from "lucide-react";

export default function GiftCodeEntryPage({ onBack, onNavigate }) {
  const [idNumber, setIdNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ficaGate, setFicaGate] = useState(null); // null | { giftPreview, reason, cleanCode, cleanId }
  const [signupGate, setSignupGate] = useState(null); // null | { giftPreview, cleanCode, cleanId }

  const canSubmit = idNumber.replace(/\D/g, "").length === 13 && code.replace(/\D/g, "").length === 6;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setFicaGate(null);
    try {
      const res = await fetch("/api/gift/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_number: idNumber.replace(/\D/g, ""),
          code: code.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Unable to verify. Please check your details.");
        setLoading(false);
        return;
      }

      const { registration_status, kyc_done, mint_number_set, gift_preview } = data;
      const cleanCode = code.replace(/\D/g, "");
      const cleanId = idNumber.replace(/\D/g, "");

      if (registration_status === "not_registered") {
        setSignupGate({ giftPreview: gift_preview, cleanCode, cleanId });
        setLoading(false);
        return;
      }

      // Hard gate — FICA or mint setup incomplete
      if (!kyc_done || !mint_number_set) {
        const reason = !kyc_done
          ? "Your identity (FICA) verification is not complete. You must verify your identity before you can claim an investment gift."
          : "Your Mint account setup is not complete. You must finish account setup before you can claim an investment gift.";
        setFicaGate({ giftPreview: gift_preview, reason, cleanCode, cleanId });
        setLoading(false);
        return;
      }

      onNavigate?.("giftPreview", { code: cleanCode, idNumber: cleanId, giftPreview: gift_preview });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Not a Mint client — prompt to sign up ────────────────────────────────
  if (signupGate) {
    return (
      <div className="min-h-screen bg-[#f8f6fa] flex flex-col">
        <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSignupGate(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Create an Account</h1>
        </div>

        <div className="flex-1 flex items-start justify-center px-5 pt-8">
          <div className="w-full max-w-sm space-y-5">
            {/* Gift preview */}
            {signupGate.giftPreview && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl p-5 text-center">
                <div className="text-3xl mb-2">🎁</div>
                <p className="text-slate-600 text-sm">
                  <span className="font-semibold text-slate-800">{signupGate.giftPreview.sender_name || "Someone"}</span> gifted you
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{signupGate.giftPreview.asset_name}</p>
              </div>
            )}

            {/* Message */}
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-4">
              <UserPlus size={20} className="text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-800 mb-1">You're not on Mint yet</p>
                <p className="text-xs text-violet-700 leading-relaxed">
                  To claim this investment gift you need a Mint account. Sign up — it only takes a few minutes. Your gift will be waiting for you once you're set up.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.("auth", {
                pendingGiftCode: signupGate.cleanCode,
                pendingIdNumber: signupGate.cleanId,
                giftPreview: signupGate.giftPreview,
              })}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 text-white font-bold text-sm active:scale-95 transition-all"
            >
              Sign Up & Claim Gift
            </button>

            <button
              type="button"
              onClick={() => setSignupGate(null)}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FICA hard gate screen ─────────────────────────────────────────────────
  if (ficaGate) {
    return (
      <div className="min-h-screen bg-[#f8f6fa] flex flex-col">
        <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setFicaGate(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Verification Required</h1>
        </div>

        <div className="flex-1 flex items-start justify-center px-5 pt-8">
          <div className="w-full max-w-sm space-y-5">
            {/* Gift preview mini-card */}
            {ficaGate.giftPreview && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl p-5 text-center">
                <div className="text-3xl mb-2">🎁</div>
                <p className="text-slate-600 text-sm">
                  <span className="font-semibold text-slate-800">{ficaGate.giftPreview.sender_name || "Someone"}</span> gifted you
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{ficaGate.giftPreview.asset_name}</p>
              </div>
            )}

            {/* Hard gate message */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
              <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Action required before claiming</p>
                <p className="text-xs text-amber-700 leading-relaxed">{ficaGate.reason}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed px-4">
              This is a regulatory requirement. Once your verification is complete, return here with the same code to claim your gift.
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.("userOnboarding", {
                pendingGiftCode: ficaGate.cleanCode,
                pendingIdNumber: ficaGate.cleanId,
                giftPreview: ficaGate.giftPreview,
              })}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 text-white font-bold text-sm active:scale-95 transition-all"
            >
              Complete Verification
            </button>

            <button
              type="button"
              onClick={() => setFicaGate(null)}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal entry screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f6fa] flex flex-col">
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
        )}
        <h1 className="text-lg font-bold text-slate-800">Claim a Gift</h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-5 pt-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Enter your South African ID number and the 6-digit code shared by the gift sender.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">SA ID Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={idNumber}
                onChange={e => setIdNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="1234567890123"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">6-Digit Gift Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 ${canSubmit && !loading ? "bg-gradient-to-r from-[#1e1b4b] to-[#312e81]" : "bg-slate-300 cursor-not-allowed"}`}
          >
            {loading ? "Verifying…" : "Continue"}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Your ID number is only used to verify your identity. It is never shared with the gift sender.
          </p>
        </div>
      </div>
    </div>
  );
}
