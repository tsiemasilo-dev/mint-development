import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function GiftPreviewPage({ code, idNumber, giftPreview, onBack, onNavigate }) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { asset_name, sender_name, message, expires_at } = giftPreview || {};

  function formatExpiry(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs <= 0) return "expired";
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 0) return `${diffH}h ${diffM}m remaining`;
    return `${diffM}m remaining`;
  }

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        onNavigate?.("auth");
        return;
      }
      const res = await fetch("/api/gift/claim-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ code, id_number: idNumber }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.kyc_required) { onNavigate?.("userOnboarding"); return; }
        if (data.mint_number_required) { onNavigate?.("userOnboarding"); return; }
        setError(data.error || "Failed to claim gift.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f6fa] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Gift claimed!</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            <strong>{asset_name}</strong> has been added to your portfolio.
          </p>
          <button
            onClick={() => onNavigate?.("investments")}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-bold text-sm"
          >
            View My Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fa] flex flex-col">
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Your Gift</h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-5 pt-8">
        <div className="w-full max-w-sm space-y-5">
          {/* Gift card */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎁</div>
              <p className="text-slate-600 text-sm mb-1">
                <span className="font-semibold text-slate-800">{sender_name || "Someone"}</span> gifted you
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{asset_name}</p>
            </div>
            {message && (
              <div className="mt-4 bg-white/70 rounded-2xl px-4 py-3">
                <p className="text-slate-600 text-sm italic text-center">"{message}"</p>
              </div>
            )}
          </div>

          {/* Expiry */}
          {expires_at && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-amber-800 text-xs font-semibold">{formatExpiry(expires_at)}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-bold text-base disabled:opacity-60 active:scale-95 transition-all"
          >
            {claiming ? "Claiming…" : "Claim My Gift"}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Your investment will appear in your portfolio immediately after claiming.
          </p>
        </div>
      </div>
    </div>
  );
}
