import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const fmt = (cents) =>
  `R${(Number(cents) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  pending_claim: "text-violet-700 bg-violet-50",
  pending_registration: "text-amber-700 bg-amber-50",
  claimed: "text-emerald-700 bg-emerald-50",
  expired: "text-red-600 bg-red-50",
  cancelled: "text-slate-500 bg-slate-100",
};

const STATUS_LABELS = {
  pending_claim: "Ready to claim",
  pending_registration: "Registration required",
  claimed: "Claimed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export default function GiftClaimPage({ token, onBack, onNavigate }) {
  const [gift, setGift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [kycRequired, setKycRequired] = useState(false);
  const [mintRequired, setMintRequired] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`/api/gift/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGift(data);
      })
      .catch(() => setError("Failed to load gift."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleClaim() {
    if (!user) { onNavigate?.("auth"); return; }
    setClaiming(true);
    setError(null);
    setKycRequired(false);
    setMintRequired(false);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.kyc_required) { setKycRequired(true); return; }
        if (data.mint_required) { setMintRequired(true); return; }
        setError(data.error || "Failed to claim gift.");
        return;
      }
      setSuccess(true);
      setGift((g) => ({ ...g, status: "claimed" }));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f6fa] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );

  if (error && !gift) {
    return (
      <div className="min-h-screen bg-[#f8f6fa] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">🎁</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Gift not found</h1>
          <p className="text-slate-500 text-sm">{error}</p>
          <button onClick={onBack} className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">Go back</button>
        </div>
      </div>
    );
  }

  const isExpiredOrCancelled = gift?.status === "expired" || gift?.status === "cancelled";
  const isAlreadyClaimed = gift?.status === "claimed";
  const isRegistrationRequired = gift?.status === "pending_registration";
  const canClaim = gift?.status === "pending_claim" && !success;
  const expiryDate = gift?.expires_at ? new Date(gift.expires_at).toLocaleDateString("en-ZA") : null;

  return (
    <div className="min-h-screen bg-[#f8f6fa] flex items-center justify-center px-6 py-10">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm">
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-[#1e1b4b]">mint</div>
          <div className="text-slate-400 text-xs mt-1">Investment Gift</div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🎁</div>
            <p className="text-slate-600 text-sm mb-1"><span className="font-semibold text-slate-800">{gift?.sender_name}</span> gifted you</p>
            <p className="text-3xl font-extrabold text-violet-700 my-2">{fmt(gift?.amount)}</p>
            <p className="text-slate-700 font-semibold text-sm">{gift?.asset_name}</p>
          </div>
          {gift?.message && (
            <div className="mt-4 bg-white/70 rounded-xl px-4 py-3">
              <p className="text-slate-600 text-sm italic">"{gift.message}"</p>
            </div>
          )}
        </div>

        {gift?.status && (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${STATUS_COLORS[gift.status]}`}>
            {STATUS_LABELS[gift.status]}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 rounded-2xl p-5 mb-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-emerald-700 font-bold text-sm">Gift claimed!</p>
            <p className="text-emerald-600 text-xs mt-1">{fmt(gift?.amount)} has been added to your portfolio.</p>
            <button onClick={() => onNavigate?.("home")} className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">View Portfolio</button>
          </div>
        )}

        {kycRequired && (
          <div className="bg-amber-50 rounded-2xl p-5 mb-4">
            <p className="text-amber-800 font-semibold text-sm mb-1">FICA verification required</p>
            <p className="text-amber-700 text-xs leading-relaxed mb-4">You need to complete your identity verification (FICA) before you can claim this gift.</p>
            <button onClick={() => onNavigate?.("userOnboarding")} className="w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">Complete Verification</button>
          </div>
        )}

        {mintRequired && (
          <div className="bg-amber-50 rounded-2xl p-5 mb-4">
            <p className="text-amber-800 font-semibold text-sm mb-1">Account setup required</p>
            <p className="text-amber-700 text-xs leading-relaxed mb-4">You need to finish setting up your Mint account before claiming this gift.</p>
            <button onClick={() => onNavigate?.("userOnboarding")} className="w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">Complete Setup</button>
          </div>
        )}

        {canClaim && !success && !kycRequired && !mintRequired && (
          <>
            {!user && <p className="text-slate-500 text-xs mb-4 text-center">You need to be logged in and FICA-verified to claim this gift.</p>}
            {error && <div className="bg-red-50 rounded-xl px-4 py-3 mb-4"><p className="text-red-600 text-xs">{error}</p></div>}
            <button onClick={handleClaim} disabled={claiming} className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-bold text-base disabled:opacity-60">
              {claiming ? "Claiming…" : user ? "Claim My Gift" : "Log in to Claim"}
            </button>
            {expiryDate && <p className="text-slate-400 text-xs text-center mt-3">Expires {expiryDate}</p>}
          </>
        )}

        {isRegistrationRequired && (
          <div className="bg-amber-50 rounded-2xl p-5 mb-4">
            <p className="text-amber-800 font-semibold text-sm mb-1">Account required</p>
            <p className="text-amber-700 text-xs leading-relaxed">To receive this gift, create a Mint account and complete your FICA verification. Once verified, your gift will be waiting for you.</p>
            <button onClick={() => onNavigate?.("auth")} className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">Register on Mint</button>
          </div>
        )}

        {isAlreadyClaimed && !success && (
          <div className="bg-emerald-50 rounded-2xl p-5 mb-4 text-center">
            <p className="text-emerald-700 font-semibold text-sm">This gift has been claimed.</p>
            <button onClick={() => onNavigate?.("home")} className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-semibold text-sm">Go to Mint</button>
          </div>
        )}

        {isExpiredOrCancelled && (
          <div className="bg-slate-50 rounded-2xl p-5 mb-4 text-center">
            <p className="text-slate-500 text-sm">
              {gift.status === "expired" ? "This gift has expired and was returned to the sender." : "This gift was cancelled."}
            </p>
            <button onClick={onBack} className="mt-3 text-xs font-semibold text-slate-400">Go back</button>
          </div>
        )}

        <p className="text-slate-300 text-xs text-center mt-4">Mint — Smart investing for South African families</p>
      </div>
    </div>
  );
}
