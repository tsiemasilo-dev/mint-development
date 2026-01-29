import React, { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

const StockDetailPage = ({ security, onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("1D");
  const periods = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

  // Mock price data for chart visualization
  const currentPrice = security.eps ? (security.pe * security.eps).toFixed(2) : "26,917";
  const priceChange = "+237";
  const percentChange = "+0.89%";
  const isPositive = true;

  // Generate mock chart data points
  const generateChartData = () => {
    const points = 50;
    const data = [];
    let baseValue = 26800;
    for (let i = 0; i < points; i++) {
      baseValue += (Math.random() - 0.45) * 100;
      data.push(baseValue);
    }
    return data;
  };

  const chartData = generateChartData();
  const minValue = Math.min(...chartData);
  const maxValue = Math.max(...chartData);

  return (
    <div className="min-h-screen bg-white pb-[env(safe-area-inset-bottom)] text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 pt-12">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mt-6 flex items-start gap-3">
          {security.logo_url ? (
            <img
              src={security.logo_url}
              alt={security.symbol}
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-xl font-bold text-white">
              {security.symbol?.substring(0, 2) || "—"}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              {security.name || security.short_name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-slate-600">{security.symbol}</p>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <img
                  src="https://flagcdn.com/w20/za.png"
                  alt="South Africa"
                  className="h-3 w-4 rounded-sm object-cover"
                />
                <p className="text-sm text-slate-600">{security.exchange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-slate-900">{currentPrice}</p>
            <span className="text-sm text-slate-500">{security.currency || "ZAC"}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-lg font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {priceChange}
            </span>
            <span className={`text-lg font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {percentChange}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            As of today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} GMT+2
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-6">
          {["Overview", "Financials", "News", "Documents"].map((tab, idx) => (
            <button
              key={tab}
              className={`pb-3 text-sm font-semibold transition-colors ${
                idx === 0
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-10">
        {/* Chart Section */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Chart</h2>
            <button className="text-sm text-slate-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
          </div>

          {/* Period Selector */}
          <div className="mt-4 flex gap-2">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  selectedPeriod === period
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="relative mt-6 h-64">
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="0"
                  y1={`${(i / 4) * 100}%`}
                  x2="100%"
                  y2={`${(i / 4) * 100}%`}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              ))}

              {/* Area fill */}
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Chart line and area */}
              <g>
                {/* Area path */}
                <path
                  d={`M 0,${((maxValue - chartData[0]) / (maxValue - minValue)) * 100}% ${chartData
                    .map((value, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = ((maxValue - value) / (maxValue - minValue)) * 100;
                      return `L ${x}%,${y}%`;
                    })
                    .join(' ')} L 100%,100% L 0,100% Z`}
                  fill="url(#areaGradient)"
                />
                {/* Line path */}
                <path
                  d={`M 0,${((maxValue - chartData[0]) / (maxValue - minValue)) * 100}% ${chartData
                    .map((value, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = ((maxValue - value) / (maxValue - minValue)) * 100;
                      return `L ${x}%,${y}%`;
                    })
                    .join(' ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>

            {/* Y-axis labels */}
            <div className="absolute right-0 top-0 flex h-full flex-col justify-between py-2 text-xs text-slate-400">
              {[maxValue, (maxValue + minValue) / 2, minValue].map((val, i) => (
                <span key={i}>{Math.round(val).toLocaleString()}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Key Stats */}
        <section className="mt-8">
          <h3 className="text-sm font-semibold text-slate-700">Key Statistics</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {security.pe && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">P/E Ratio</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.pe).toFixed(2)}</p>
              </div>
            )}
            {security.eps && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">EPS</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.eps).toFixed(2)}</p>
              </div>
            )}
            {security.dividend_yield && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Dividend Yield</p>
                <p className="mt-2 text-lg font-semibold text-emerald-600">{Number(security.dividend_yield).toFixed(2)}%</p>
              </div>
            )}
            {security.beta && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Beta</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{Number(security.beta).toFixed(2)}</p>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        {security.description && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">About</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{security.description}</p>
            {security.website && (
              <a
                href={security.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Visit website →
              </a>
            )}
          </section>
        )}

        {/* Sector & Industry */}
        {(security.sector || security.industry) && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">Classification</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {security.sector && (
                <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700">
                  {security.sector}
                </span>
              )}
              {security.industry && (
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
                  {security.industry}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 py-4 font-semibold text-white shadow-lg transition-all active:scale-95">
            Buy
          </button>
          <button className="rounded-2xl border-2 border-slate-200 bg-white py-4 font-semibold text-slate-900 transition-all active:scale-95">
            Add to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailPage;
