import React, { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

const StockBuyPage = ({ security, onBack, onContinue }) => {
  const [shares, setShares] = useState(1);

  const { displayCurrency, priceValue } = useMemo(() => {
    const currency = security?.currency || "R";
    const normalizedCurrency = currency.toUpperCase() === "ZAC" ? "R" : currency;
    const currentPrice = Number(security?.currentPrice ?? 0);
    const normalizedPrice = currency.toUpperCase() === "ZAC" ? currentPrice / 100 : currentPrice;
    return {
      displayCurrency: normalizedCurrency,
      priceValue: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
    };
  }, [security]);

  const totalAmount = useMemo(() => {
    const total = Number(shares || 0) * priceValue;
    return Number.isFinite(total) ? total : 0;
  }, [shares, priceValue]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!security || !shares || shares <= 0) return;
    onContinue?.(totalAmount, security);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
          <h1 className="text-lg font-semibold">Buy {security?.symbol || "Stock"}</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-md">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price per share</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {displayCurrency}{priceValue.toFixed(2)}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Number of shares
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={shares}
              onChange={(event) => setShares(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold text-slate-900">
                {displayCurrency}{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-black to-purple-600 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition-all active:scale-95"
          >
            Invest
          </button>
        </form>
      </div>
    </div>
  );
};

export default StockBuyPage;
