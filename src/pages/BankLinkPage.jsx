import React from "react";
import { ArrowLeft, Landmark, Building2, CreditCard, Shield } from "lucide-react";

const BankLinkPage = ({ onBack }) => {
  const banks = [
    { name: "FNB", icon: "🏦" },
    { name: "Standard Bank", icon: "🏦" },
    { name: "ABSA", icon: "🏦" },
    { name: "Nedbank", icon: "🏦" },
    { name: "Capitec", icon: "🏦" },
    { name: "Other Bank", icon: "🏦" },
  ];

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

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-6">
            <Landmark className="h-10 w-10" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect Your Bank</h2>
          <p className="text-sm text-slate-500 mb-8">
            Link your bank account to enable instant transfers and deposits.
          </p>

          <div className="w-full space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 text-left">
              Select your bank
            </p>
            {banks.map((bank) => (
              <button
                key={bank.name}
                type="button"
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
                  {bank.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{bank.name}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Shield className="h-4 w-4" />
            <span>Bank-level security. Your credentials are never stored.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankLinkPage;
