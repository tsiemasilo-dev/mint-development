import React, { useState, useEffect } from "react";
import { ArrowLeft, Info } from "lucide-react";

const InvestAmountPage = ({ onBack, strategy, onContinue }) => {
  const [amount, setAmount] = useState("0");

  const handleNumberPress = (num) => {
    if (amount === "0") {
      setAmount(String(num));
    } else {
      setAmount(amount + String(num));
    }
  };

  const handleDecimal = () => {
    if (!amount.includes(".")) {
      setAmount(amount + ".");
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount("0");
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const currentStrategy = strategy || {
    name: "Strategy",
    tags: [],
    description: "",
  };

  const numericAmount = parseFloat(amount) || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold">Amount</h1>
        </header>

        {/* Strategy Card */}
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-600 truncate">Strategy</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{currentStrategy.name}</p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white">
              <span className="text-xs font-bold">S</span>
            </div>
          </div>
        </section>

        {/* Amount Display */}
        <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-5xl font-semibold text-slate-900">
              R{amount}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3">
            <Info className="h-4 w-4 flex-shrink-0 text-slate-600" />
            <p className="text-xs text-slate-600">
              You'll be redirected to complete payment on Paystack
            </p>
          </div>
        </section>

        {/* Number Keypad */}
        <section className="mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberPress(num)}
                className="rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:bg-slate-100"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberPress(num)}
                className="rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:bg-slate-100"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberPress(num)}
                className="rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:bg-slate-100"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleDecimal}
              className="rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:bg-slate-100"
            >
              •
            </button>
            <button
              type="button"
              onClick={() => handleNumberPress(0)}
              className="rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:bg-slate-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded-2xl border border-slate-200 bg-slate-900 py-4 text-lg font-semibold text-white shadow-sm hover:bg-slate-800 active:bg-slate-950"
            >
              ✕
            </button>
          </div>
        </section>

        {/* Continue Button */}
        <button
          type="button"
          onClick={() => onContinue?.(numericAmount)}
          disabled={numericAmount <= 0}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default InvestAmountPage;
