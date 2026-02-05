import React, { useState } from "react";
import { Bell, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";

const MOCK_DATA = {
  accountValue: 24897.43,
  selectedStrategy: {
    name: "Balanced Growth",
    currentValue: 4449.30,
    previousMonthChange: 21,
  },
  chartData: {
    weekly: [
      { day: "Sat", value: 3200 },
      { day: "Sun", value: 3800 },
      { day: "Mon", value: 4100 },
      { day: "Tue", value: 8720, highlighted: true },
      { day: "Wed", value: 4200 },
      { day: "Thu", value: 4449 },
    ],
    monthly: [
      { label: "Week 1", value: 3500 },
      { label: "Week 2", value: 4200 },
      { label: "Week 3", value: 5800 },
      { label: "Week 4", value: 4449 },
    ],
    allTime: [
      { label: "Jan", value: 2800 },
      { label: "Feb", value: 3200 },
      { label: "Mar", value: 3800 },
      { label: "Apr", value: 4100 },
      { label: "May", value: 4449 },
    ],
  },
  goals: [
    { name: "First Home", current: 150000, target: 500000 },
  ],
  holdings: [
    { symbol: "NED.JO", name: "Nedbank Group", weight: 13.9, logo: "https://logo.clearbit.com/nedbank.co.za" },
    { symbol: "SUI.JO", name: "Sun International", weight: 16.8, logo: "https://logo.clearbit.com/suninternational.com" },
    { symbol: "EXP.JO", name: "Exemplar REITail Ltd.", weight: 19.0, logo: null },
    { symbol: "SBK.JO", name: "Standard Bank Group", weight: 12.5, logo: "https://logo.clearbit.com/standardbank.co.za" },
  ],
};

const NewPortfolioPage = () => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("strategy");
  const [timeFilter, setTimeFilter] = useState("W");

  const { accountValue, selectedStrategy, chartData, goals, holdings } = MOCK_DATA;

  const getChartData = () => {
    switch (timeFilter) {
      case "D": return chartData.weekly.slice(0, 3);
      case "W": return chartData.weekly;
      case "M": return chartData.monthly;
      case "A": return chartData.allTime;
      default: return chartData.weekly;
    }
  };

  const currentChartData = getChartData();
  const maxValue = Math.max(...currentChartData.map(d => d.value));
  const highlightedPoint = currentChartData.find(d => d.highlighted);

  const formatCurrency = (value) => {
    return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const goal = goals[0];
  const goalProgress = (goal.current / goal.target) * 100;

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] text-white relative overflow-hidden">
      {/* Multi-layer gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient: deep purple ends at pill buttons, indigo starts at chart, lavender in middle */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(180deg, #0d0d12 0%, #0f0a18 5%, #120c1f 10%, #1a1035 18%, #251548 24%, #2d1860 28%, #3b2066 32%, #5b3490 38%, #7c5aad 45%, #a88bc7 52%, #c9b5dc 58%, #ddd0e8 64%, #ebe4f2 70%, #f3eff8 78%, #f8f5fb 85%, #faf8fc 100%)'
          }} 
        />
        
        {/* Mid-section indigo/royal purple glow - positioned around chart start */}
        <div 
          className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[150%] h-[35%] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.4) 0%, rgba(76,29,149,0.2) 35%, transparent 65%)' }}
        />
        
        {/* Large radial ambient glow behind account balance */}
        <div 
          className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[300px] h-[180px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.2) 0%, rgba(76,29,149,0.1) 40%, transparent 70%)', filter: 'blur(40px)' }}
        />
        
        {/* Vertical light beam behind graph peak area */}
        <div 
          className="absolute top-[32%] left-[58%] w-[100px] h-[280px] -translate-x-1/2"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.25) 25%, rgba(167,139,250,0.4) 50%, rgba(139,92,246,0.25) 75%, transparent 100%)', filter: 'blur(25px)' }}
        />
        <div 
          className="absolute top-[36%] left-[58%] w-[50px] h-[180px] -translate-x-1/2"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(196,181,253,0.4) 35%, rgba(221,214,254,0.5) 50%, rgba(196,181,253,0.4) 65%, transparent 100%)', filter: 'blur(15px)' }}
        />
        
        {/* Subtle surface reflection/gloss in the middle-lower area */}
        <div 
          className="absolute top-[48%] left-0 right-0 h-[52%]"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(237,233,254,0.3) 15%, rgba(248,245,251,0.6) 35%, rgba(250,248,252,0.85) 55%, rgba(252,250,253,0.95) 75%, #fcfafd 100%)' }}
        />
        <div 
          className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[130%] h-[60px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 50%, transparent 80%)', filter: 'blur(15px)' }}
        />
      </div>

      {/* Header section */}
      <div className="relative px-5 pb-8 pt-12 md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5 md:max-w-md">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-sm font-semibold text-amber-900 shadow-lg shadow-amber-500/20">
                JD
              </div>
              <p className="text-base font-medium text-white">Hello, Johnson</p>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 backdrop-blur-sm transition hover:bg-white/10">
              <Bell className="h-5 w-5 text-white/90" />
            </button>
          </header>

          {/* Account balance with ambient glow */}
          <section className="mt-2 relative">
            <div className="absolute -inset-8 bg-gradient-radial from-[#7c3aed]/20 via-transparent to-transparent rounded-full blur-2xl -z-10" />
            <div className="flex items-center gap-3">
              <p className="text-3xl font-semibold tracking-tight">
                {balanceVisible ? formatCurrency(accountValue) : "R•••••••"}
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
              >
                {balanceVisible ? (
                  <Eye className="h-4 w-4 text-white/60" />
                ) : (
                  <EyeOff className="h-4 w-4 text-white/60" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-white/50">Account Value</p>
          </section>

          <section className="flex gap-2 mt-1">
            {[
              { id: "strategy", label: "Strategy" },
              { id: "stocks", label: "Stocks" },
              { id: "goals", label: "Goals" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30"
                    : "bg-white/10 text-white/70 backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </section>
        </div>
      </div>

      {/* Content section */}
      <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white/90 backdrop-blur-xl p-5 shadow-xl shadow-purple-900/10 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <button className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition">
              <span className="text-sm font-semibold">{selectedStrategy.name}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="flex gap-1">
              {["D", "W", "M", "A"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    timeFilter === filter
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedStrategy.currentValue)}</p>
            <p className="text-sm text-emerald-600 font-medium">
              +{selectedStrategy.previousMonthChange}% Previous Month
            </p>
          </div>

          <div className="relative h-32 mb-2">
            <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(139, 92, 246, 0.6)" />
                  <stop offset="50%" stopColor="rgba(124, 58, 237, 1)" />
                  <stop offset="100%" stopColor="rgba(139, 92, 246, 0.6)" />
                </linearGradient>
                <linearGradient id="highlightGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="rgba(250, 204, 21, 0)" />
                  <stop offset="50%" stopColor="rgba(250, 204, 21, 0.6)" />
                  <stop offset="100%" stopColor="rgba(250, 204, 21, 1)" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <path
                d={`M ${currentChartData.map((d, i) => {
                  const x = (i / (currentChartData.length - 1)) * 300;
                  const y = 100 - (d.value / maxValue) * 80;
                  return `${i === 0 ? '' : 'L '}${x} ${y}`;
                }).join(' ')}`}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />

              {currentChartData.map((d, i) => {
                if (!d.highlighted) return null;
                const x = (i / (currentChartData.length - 1)) * 300;
                const y = 100 - (d.value / maxValue) * 80;
                return (
                  <g key={i}>
                    <rect
                      x={x - 8}
                      y={y}
                      width="16"
                      height={100 - y}
                      fill="url(#highlightGradient)"
                      rx="4"
                    />
                    <circle cx={x} cy={y} r="6" fill="#facc15" filter="url(#glow)" />
                    <circle cx={x} cy={y} r="3" fill="white" />
                  </g>
                );
              })}
            </svg>
            
            {highlightedPoint && (
              <div 
                className="absolute bg-slate-900 text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg shadow-lg"
                style={{ 
                  left: `${(currentChartData.findIndex(d => d.highlighted) / (currentChartData.length - 1)) * 100}%`,
                  top: '0',
                  transform: 'translateX(-50%)'
                }}
              >
                R{highlightedPoint.value.toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex justify-between text-xs text-slate-400 px-1">
            {currentChartData.map((d, i) => (
              <span 
                key={i} 
                className={d.highlighted ? "text-amber-500 font-semibold" : ""}
              >
                {d.day || d.label}
              </span>
            ))}
          </div>
        </section>

        <button className="w-full py-3.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-xl">
          View All Allocations
        </button>

        <section className="rounded-3xl bg-white/90 backdrop-blur-xl p-5 shadow-xl shadow-purple-900/10 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Linked Goals</p>
            <button className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition">
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">{goal.name}</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
              </p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {goalProgress.toFixed(0)}% of your goal achieved
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white/90 backdrop-blur-xl p-5 shadow-xl shadow-purple-900/10 border border-white/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-900">Portfolio Holdings</p>
          </div>
          <p className="text-xs text-slate-400 mb-4">Top holdings by weight</p>
          
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div 
                key={holding.symbol}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 overflow-hidden">
                    {holding.logo ? (
                      <img 
                        src={holding.logo} 
                        alt={holding.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span 
                      className={`text-xs font-bold text-slate-600 ${holding.logo ? 'hidden' : 'flex'}`}
                    >
                      {holding.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{holding.symbol}</p>
                    <p className="text-xs text-slate-500">{holding.name}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {holding.weight.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NewPortfolioPage;
