import React, { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { StrategyReturnHeaderChart } from "../components/StrategyReturnHeaderChart";

const OpenStrategiesPage = ({ onBack }) => {
  const series = [
    { label: "Jan", returnPct: 0.6 },
    { label: "Feb", returnPct: 1.4 },
    { label: "Mar", returnPct: 1.1 },
    { label: "Apr", returnPct: 2.0 },
    { label: "May", returnPct: 2.8 },
    { label: "Jun", returnPct: 3.3 },
    { label: "Jul", returnPct: 3.9 },
    { label: "Aug", returnPct: 4.1 },
    { label: "Sep", returnPct: 4.6 },
    { label: "Oct", returnPct: 4.9 },
    { label: "Nov", returnPct: 5.2 },
    { label: "Dec", returnPct: 5.5 },
  ];
  const [returnValue, setReturnValue] = useState(series[series.length - 1]?.returnPct ?? 5.5);
  const formattedReturn = `${returnValue >= 0 ? "+" : ""}${returnValue.toFixed(2)}%`;

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
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-semibold">OpenStrategies</h1>
          </div>
          <div className="h-10 w-10" />
        </header>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_rgba(79,70,229,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                <img
                  src="https://s3-symbol-logo.tradingview.com/country/ZA--big.svg"
                  alt="South Africa"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">AlgoHive Core</h2>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">
                    Popular
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">MI90b · JSE</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-semibold text-slate-900">{formattedReturn}</p>
            </div>
            <p className="text-xs text-slate-400">Last updated 2h ago</p>
          </div>

          <div className="mt-4">
            <StrategyReturnHeaderChart
              series={series}
              onValueChange={(value) => setReturnValue(value)}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Max DD: 6.2%</span>
            <span>Volatility: Low</span>
            <span>Fees: 0.6%</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Balanced", "Low risk", "Automated"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200/70"
        >
          View factsheet
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-900">Today</span>
            <span className="text-sm text-slate-500">US rates steady as tech rallies</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

export default OpenStrategiesPage;
