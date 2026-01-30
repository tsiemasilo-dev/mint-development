import React, { useState } from "react";
import { ArrowLeft, BadgeCheck, Upload, Camera } from "lucide-react";

const IdentityCheckPage = ({ onBack }) => {
  const [step, setStep] = useState(1);

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

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-violet-600 mb-6">
            <BadgeCheck className="h-10 w-10" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Verify Your Identity</h2>
          <p className="text-sm text-slate-500 mb-8">
            Complete identity verification to unlock higher limits and access all features.
          </p>

          <div className="w-full space-y-4">
            <button
              type="button"
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                <Upload className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Upload ID Document</p>
                <p className="text-xs text-slate-500">Passport, driver's license, or national ID</p>
              </div>
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <Camera className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Take a Selfie</p>
                <p className="text-xs text-slate-500">We'll match it with your ID photo</p>
              </div>
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Your information is encrypted and securely stored. We never share your data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdentityCheckPage;
