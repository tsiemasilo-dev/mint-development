import React from "react";
import { ArrowLeft, BadgeCheck } from "lucide-react";

const IdentityCheckPage = ({ onBack }) => {
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
          <h1 className="text-lg font-semibold">Identity Verification</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-violet-600 mb-6">
            <BadgeCheck className="h-10 w-10" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Coming Soon</h2>
          <p className="text-sm text-slate-500">
            Identity verification will be available during onboarding.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdentityCheckPage;
