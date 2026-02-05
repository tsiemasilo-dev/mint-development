import React, { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getSecurityBySymbol, getSecurityPrices, normalizePriceSeries } from "../lib/marketData.js";
import TradingViewChart from '../components/TradingViewChart';

const StockDetailPage = ({ security: initialSecurity, onBack, onOpenBuy }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [security, setSecurity] = useState(initialSecurity);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const periods = ["1W", "1M", "3M", "6M", "YTD", "1Y"];

  console.log("🔍 Initial security prop:", {
    symbol: initialSecurity?.symbol,
    currentPrice: initialSecurity?.currentPrice,
    changeAbs: initialSecurity?.changeAbs,
    changePct: initialSecurity?.changePct
  });

  // Fetch updated security data with metrics
  useEffect(() => {
    const fetchSecurityData = async () => {
      if (!initialSecurity?.symbol) return;
      
      try {
        const updatedSecurity = await getSecurityBySymbol(initialSecurity.symbol);
        if (updatedSecurity) {
          console.log("📊 Updated security data:", {
            currentPrice: updatedSecurity.currentPrice,
            changeAbs: updatedSecurity.changeAbs,
            changePct: updatedSecurity.changePct
          });
          setSecurity(updatedSecurity);
        }
      } catch (error) {
        console.error("Error fetching security data:", error);
      }
    };

    fetchSecurityData();
  }, [initialSecurity?.symbol]);

  // Fetch price history when period changes
  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!security?.id) return;
      
      setLoading(true);
      try {
        const prices = await getSecurityPrices(security.id, selectedPeriod);
        setPriceHistory(prices);
      } catch (error) {
        console.error("Error fetching price history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [security?.id, selectedPeriod]);

  // Always prefer fetched security data, fallback to initialSecurity for display
  const displaySecurity = security?.id ? security : initialSecurity;
  
  console.log("💰 Display data:", {
    currentPrice: displaySecurity?.currentPrice,
    changeAbs: displaySecurity?.changeAbs,
    changePct: displaySecurity?.changePct,
    hasCurrentPrice: displaySecurity?.currentPrice != null,
    hasChangeAbs: displaySecurity?.changeAbs != null
  });
  
  const currentPrice = displaySecurity?.currentPrice != null 
    ? Number(displaySecurity.currentPrice).toFixed(2)
    : "—";
  const priceChange = displaySecurity?.changeAbs != null 
    ? (displaySecurity.changeAbs >= 0 ? '+' : '') + Number(displaySecurity.changeAbs).toFixed(2)
    : "—";
  const percentChange = displaySecurity?.changePct != null 
    ? (displaySecurity.changePct >= 0 ? '+' : '') + Number(displaySecurity.changePct).toFixed(2) + '%'
    : "—";
  const isPositive = displaySecurity?.changePct != null && displaySecurity.changePct >= 0;

  // Generate chart data from price history - filter out nulls
  const chartData = priceHistory.length > 0 
    ? priceHistory.filter(p => p.close != null).map(p => p.close) 
    : [];
  
  // Calculate chart return for the selected period
  const chartReturn = chartData.length >= 2 
    ? ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100
    : 0;
  const isChartPositive = chartReturn >= 0;
  
  // Get return from security metrics for selected period
  const getSelectedPeriodReturn = () => {
    if (!displaySecurity?.returns) return null;
    const periodMap = {
      '1W': displaySecurity.returns.r_1w,
      '1M': displaySecurity.returns.r_1m,
      '3M': displaySecurity.returns.r_3m,
      '6M': displaySecurity.returns.r_6m,
      'YTD': displaySecurity.returns.r_ytd,
      '1Y': displaySecurity.returns.r_1y
    };
    return periodMap[selectedPeriod];
  };
  const selectedPeriodReturn = getSelectedPeriodReturn();
  

  const formatTimestamp = () => {
    if (!security.asOfDate) {
      return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const date = new Date(security.asOfDate);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };


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
            {security.asOfDate 
              ? `As of ${new Date(security.asOfDate).toLocaleDateString()} at ${formatTimestamp()} GMT+2`
              : `As of today at ${formatTimestamp()} GMT+2`
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-6">
          {["Overview"].map((tab, idx) => (
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
          <div className="mt-4">
            <div className="flex gap-2">
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
            {selectedPeriodReturn != null && (
              <div className="mt-3">
                <div className={`text-lg font-semibold ${
                  selectedPeriodReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {selectedPeriodReturn >= 0 ? '+' : ''}{selectedPeriodReturn.toFixed(2)}%
                </div>
                <p className="mt-0.5 text-xs text-slate-400">in the last {selectedPeriod}</p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="relative mt-6 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">Loading chart...</div>
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-slate-400">
                  {chartData.length === 0 ? 'No price data available' : 'Insufficient data for chart'}
                </div>
              </div>
            ) : (
              <TradingViewChart
                data={priceHistory}
                height={256}
                lineColor={isChartPositive ? '#10b981' : '#ef4444'}
                areaTopColor={isChartPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                areaBottomColor={isChartPositive ? 'rgba(16, 185, 129, 0)' : 'rgba(239, 68, 68, 0)'}
                showGrid={true}
                showTimeScale={true}
                showPriceScale={true}
                showCrosshair={true}
                lineWidth={2}
              />
            )}
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
          <button
            type="button"
            onClick={onOpenBuy}
            className="rounded-2xl bg-gradient-to-r from-black to-purple-600 py-4 font-semibold text-white shadow-lg transition-all active:scale-95"
          >
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
