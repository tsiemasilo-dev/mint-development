import React, { useState } from "react";
import { Copy, Check, Building2 } from "lucide-react";

const ACCOUNT_DETAILS = [
  { label: "Account Holder", value: "MINT PLATFORMS (PTY) LTD", copyable: false },
  { label: "Bank", value: "Standard Bank", copyable: false },
  { label: "Account Number", value: "021544700", display: "02 154 470 0", copyable: true },
  { label: "Account Type", value: "Business Current Account", copyable: false },
  { label: "Branch", value: "Sandton City", copyable: false },
  { label: "Branch Code", value: "002064", copyable: true },
  { label: "SWIFT Code", value: "SBZAZAJJ", copyable: true },
];

const DepositPage = () => {
  const [copied, setCopied] = useState(null);

  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-gradient-to-br from-[#31005e] to-[#5b21b6] px-6 pt-14 pb-10">
        <h1 className="text-2xl font-semibold text-white">Deposit</h1>
        <p className="mt-1 text-sm text-white/70">
          Transfer funds to your Mint account using the details below
        </p>
      </div>

      <div className="px-4 -mt-4">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Standard Bank</p>
              <p className="text-xs text-slate-500">EFT / Bank Transfer</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {ACCOUNT_DETAILS.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.display || item.value}
                  </p>
                </div>
                {item.copyable && (
                  <button
                    type="button"
                    onClick={() => handleCopy(item.value, item.label)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition active:scale-95 hover:bg-slate-200"
                  >
                    {copied === item.label ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4">
          <p className="text-xs font-semibold text-amber-800 mb-1">Important</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Please use your <span className="font-semibold">Mint account number</span> as the payment reference so we can allocate your deposit correctly. Deposits typically reflect within 1–2 business days.
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-white border border-slate-100 px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-1">Need help?</p>
          <p className="text-xs text-slate-500">
            Customer Care: <span className="font-medium text-slate-700">0860 123 000</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Website: <span className="font-medium text-slate-700">www.standardbank.co.za</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;
