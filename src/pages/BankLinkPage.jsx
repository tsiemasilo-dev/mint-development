import React, { useState, useEffect } from "react";
import { ArrowLeft, Landmark, CheckCircle2, Shield } from "lucide-react";
import { TruidConnector } from "../components/TruidConnector";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import { useRequiredActions } from "../lib/useRequiredActions";

const BankLinkPage = ({ onBack, onComplete }) => {
  const profile = useProfile();
  const { bankLinked } = useRequiredActions();
  const [verified, setVerified] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (bankLinked) setVerified(true);
  }, [bankLinked]);

  const handleVerified = async () => {
    setUpdatingStatus(true);
    try {
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase
            .from("required_actions")
            .update({ bank_linked: true, bank_in_review: false })
            .eq("user_id", userData.user.id);
        }
      }
      setVerified(true);
    } catch (err) {
      console.error("Failed to update bank status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (verified) {
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
            <h1 className="text-lg font-semibold">Link Bank Account</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </header>

          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Bank Account Linked</h2>
            <p className="text-sm text-slate-500 mb-8">
              Your bank account has been successfully verified and linked.
            </p>
            <button
              type="button"
              onClick={() => onComplete?.()}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold">Link Bank Account</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-6 flex flex-col items-center text-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <Landmark className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500">
            Verify and link your bank account securely through TruID.
          </p>
        </div>

        <TruidConnector
          onVerified={handleVerified}
          userProfile={{
            name: profile?.name || "",
            idNumber: profile?.idNumber || "",
          }}
        />

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-4 w-4" />
          <span>Your bank details are securely verified through TruID Connect.</span>
        </div>
      </div>
    </div>
  );
};

export default BankLinkPage;
