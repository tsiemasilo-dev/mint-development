import React, { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, UserPlus, Gift, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const HOME_BG = {
  backgroundColor: '#f8f6fa',
  backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100vh',
};

function fmt(cents) {
  if (!cents) return '';
  return `R${(Number(cents) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function GiftPreviewCard({ preview }) {
  if (!preview) return null;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
          <Gift size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs">
            <span className="font-medium text-slate-700">{preview.sender_name || "Someone"}</span> gifted you
          </p>
          <p className="text-base font-bold text-slate-900 mt-0.5 truncate">{preview.asset_name}</p>
          {preview.amount && (
            <p className="text-sm font-semibold text-violet-700 mt-0.5">{fmt(preview.amount)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GiftCodeEntryPage({ onBack, onNavigate }) {
  const [idNumber, setIdNumber] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ficaGate, setFicaGate] = useState(null);
  const [signupGate, setSignupGate] = useState(null);

  // Logged-in user flow
  const [sessionStatus, setSessionStatus] = useState("checking"); // checking | verified | incomplete | none
  const [loggedInGift, setLoggedInGift] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setSessionStatus("none"); return; }

        const pendingGiftId = localStorage.getItem('mint_pending_gift_id');

        const { data: onboarding } = await supabase
          .from("user_onboarding")
          .select("kyc_status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const kycStatus = onboarding?.kyc_status;
        const kycDone = kycStatus === "verified" || kycStatus === "onboarding_complete";

        if (!kycDone) { setSessionStatus("incomplete"); return; }

        // KYC verified — fetch gift details if there's a pending gift ID
        if (pendingGiftId) {
          const res = await fetch(`/api/gift/by-id/${pendingGiftId}`);
          if (res.ok) {
            const data = await res.json();
            if (data && !['claimed','cancelled','expired'].includes(data.status)) {
              setLoggedInGift({ ...data, gift_id: pendingGiftId });
            }
          }
        }

        setSessionStatus("verified");
      } catch {
        setSessionStatus("none");
      }
    }
    checkSession();
  }, []);

  async function handleDirectClaim() {
    if (!loggedInGift?.gift_id) return;
    setClaiming(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/gift/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gift_id: loggedInGift.gift_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.kyc_required) { setSessionStatus("incomplete"); return; }
        setError(data.error || "Failed to claim gift.");
        return;
      }
      localStorage.removeItem('mint_pending_gift_id');
      setClaimed(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

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

  // ── Loading while checking session ──────────────────────────────────────────
  if (sessionStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={HOME_BG}>
        <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  // ── Logged in + NOT KYC verified → complete onboarding first ────────────────
  if (sessionStatus === "incomplete") {
    return (
      <div className="min-h-screen flex flex-col" style={HOME_BG}>
        <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Claim Your Gift</h1>
          </div>
        </header>

        <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
          {loggedInGift && <GiftPreviewCard preview={loggedInGift} />}

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Complete your account setup first</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  To claim an investment gift, you need to complete your full FICA verification and Mint account setup. It only takes a few minutes.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate?.("userOnboarding")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
            >
              Complete My Account Setup
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm shadow-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Logged in + KYC verified → code-only entry (no SA ID needed) ───────────
  if (sessionStatus === "verified") {
    if (claimed) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6" style={HOME_BG}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Gift claimed! 🎉</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {loggedInGift?.asset_name
                ? `${loggedInGift.asset_name} has been added to your portfolio.`
                : "Your gift has been added to your portfolio."}
            </p>
            <button
              onClick={() => onNavigate?.("investments")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm shadow-lg"
            >
              View My Portfolio
            </button>
          </div>
        </div>
      );
    }

    async function handleCodeClaim() {
      if (code.replace(/\D/g, "").length !== 6) return;
      setClaiming(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/gift/claim-v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code: code.replace(/\D/g, "") }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          if (data.kyc_required) { setSessionStatus("incomplete"); return; }
          if (data.mint_number_required) { setSessionStatus("incomplete"); return; }
          setError(data.error || "Failed to claim gift.");
          return;
        }
        localStorage.removeItem('mint_pending_gift_id');
        setClaimed(true);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setClaiming(false);
      }
    }

    const codeReady = code.replace(/\D/g, "").length === 6;

    return (
      <div className="min-h-screen flex flex-col" style={HOME_BG}>
        <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-8 pt-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Claim Your Gift</h1>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/20">
              <Gift size={24} className="text-white" />
            </div>
            <p className="text-violet-200 text-sm text-center leading-relaxed max-w-[260px]">
              Enter the 6-digit code from the gift sender.
            </p>
          </div>
        </header>

        <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
          {loggedInGift && <GiftPreviewCard preview={loggedInGift} />}

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck size={11} className="text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">Identity verified — no ID number needed</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">6-Digit Gift Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={handleCodeClaim}
              disabled={!codeReady || claiming}
              className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg ${codeReady && !claiming ? "bg-gradient-to-r from-[#1a1a2e] to-[#44296b]" : "bg-slate-300 shadow-none cursor-not-allowed"}`}
            >
              {claiming ? "Claiming…" : "Claim My Gift"}
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Your investment will appear as pending in your portfolio after claiming.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not logged in → ID + code entry (for email recipients) ─────────────────
  if (signupGate) {
    return (
      <div className="min-h-screen flex flex-col" style={HOME_BG}>
        <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setSignupGate(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Create an Account</h1>
          </div>
        </header>

        <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
          <GiftPreviewCard preview={signupGate.giftPreview} />

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                <UserPlus size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">You're not on Mint yet</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  To claim this investment gift you need a Mint account. Sign up — it only takes a few minutes.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate?.("auth", {
                pendingGiftCode: signupGate.cleanCode,
                pendingIdNumber: signupGate.cleanId,
                giftPreview: signupGate.giftPreview,
              })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
            >
              Sign Up & Claim Gift
            </button>
            <button
              type="button"
              onClick={() => setSignupGate(null)}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm shadow-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ficaGate) {
    return (
      <div className="min-h-screen flex flex-col" style={HOME_BG}>
        <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setFicaGate(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Verification Required</h1>
          </div>
        </header>

        <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
          <GiftPreviewCard preview={ficaGate.giftPreview} />

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Action required</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ficaGate.reason}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed px-2">
            This is a regulatory requirement. Once verified, return here with the same code.
          </p>

          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate?.("userOnboarding", {
                pendingGiftCode: ficaGate.cleanCode,
                pendingIdNumber: ficaGate.cleanId,
                giftPreview: ficaGate.giftPreview,
              })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
            >
              Complete Verification
            </button>
            <button
              type="button"
              onClick={() => setFicaGate(null)}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm shadow-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={HOME_BG}>
      <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-8 pt-12 text-white">
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold">Claim a Gift</h1>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/20">
            <Gift size={24} className="text-white" />
          </div>
          <p className="text-violet-200 text-sm text-center leading-relaxed max-w-[260px]">
            Enter your SA ID and the 6-digit code from the gift sender.
          </p>
        </div>
      </header>

      <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">SA ID Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={idNumber}
                onChange={e => setIdNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="1234567890123"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">6-Digit Gift Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg ${canSubmit && !loading ? "bg-gradient-to-r from-[#1a1a2e] to-[#44296b]" : "bg-slate-300 shadow-none cursor-not-allowed"}`}
          >
            {loading ? "Verifying…" : "Continue"}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Your ID number is only used to verify your identity and is never shared with the sender.
          </p>
        </div>
      </div>
    </div>
  );
}
