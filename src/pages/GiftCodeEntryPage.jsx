import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function GiftCodeEntryPage({ onBack, onNavigate }) {
  const [idNumber, setIdNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = idNumber.replace(/\D/g, "").length === 13 && code.replace(/\D/g, "").length === 6;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
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

      if (registration_status === "not_registered") {
        onNavigate?.("auth", { pendingGiftCode: code.replace(/\D/g, ""), pendingIdNumber: idNumber.replace(/\D/g, ""), giftPreview: gift_preview });
        return;
      }
      if (!kyc_done) {
        onNavigate?.("userOnboarding", { pendingGiftCode: code.replace(/\D/g, ""), pendingIdNumber: idNumber.replace(/\D/g, ""), giftPreview: gift_preview });
        return;
      }
      if (!mint_number_set) {
        onNavigate?.("userOnboarding", { pendingGiftCode: code.replace(/\D/g, ""), pendingIdNumber: idNumber.replace(/\D/g, ""), giftPreview: gift_preview });
        return;
      }

      onNavigate?.("giftPreview", {
        code: code.replace(/\D/g, ""),
        idNumber: idNumber.replace(/\D/g, ""),
        giftPreview: gift_preview,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
