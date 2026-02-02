import React, { useState } from "react";
import { ArrowLeft, UserPlus, Copy, Share2, Gift, CheckCircle2 } from "lucide-react";

const InvitePage = ({ onBack }) => {
  const [copied, setCopied] = useState(false);
  const referralCode = "MINT2026";
  const referralLink = `https://mint.app/invite/${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Mint",
          text: "Join Mint and get R50 bonus when you sign up with my link!",
          url: referralLink,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Invite Friends</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white mb-6">
            <Gift className="h-10 w-10" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Earn R100 Per Referral</h2>
          <p className="text-sm text-slate-500 mb-8">
            Invite friends to Mint. You both get R50 when they sign up and make their first investment.
          </p>

          <div className="w-full rounded-2xl bg-white p-5 shadow-sm mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Your referral code
            </p>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 p-4">
              <span className="text-2xl font-bold tracking-widest text-slate-900">{referralCode}</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? "Link Copied!" : "Copy Invite Link"}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-900 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Share2 className="h-5 w-5" />
              Share with Friends
            </button>
          </div>

          <div className="mt-8 w-full rounded-2xl bg-violet-50 p-4">
            <p className="text-xs font-semibold text-violet-700 mb-2">How it works</p>
            <ul className="text-xs text-slate-600 space-y-1 text-left">
              <li>1. Share your unique referral link</li>
              <li>2. Friend signs up using your link</li>
              <li>3. They make their first investment</li>
              <li>4. You both get R50 bonus!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
