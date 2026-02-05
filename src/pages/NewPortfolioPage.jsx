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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-[#2d1560] to-[#1a0a30]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/20 rounded-full blur-[120px]" />
        
        <div className="relative px-4 pt-12 pb-6">
          <div className="mx-auto max-w-sm md:max-w-md">
            <header className="flex items-center justify-between mb-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-sm font-semibold shadow-lg shadow-violet-500/30">
                JD
              </div>
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10 transition hover:bg-white/20">
                <Bell className="h-5 w-5 text-white/90" />
              </button>
            </header>

            <section className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-transparent rounded-3xl blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <p className="text-4xl font-bold tracking-tight">
                    {balanceVisible ? formatCurrency(accountValue) : "R•••••••"}
                  </p>
                  <button
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
                  >
                    {balanceVisible ? (
                      <Eye className="h-4 w-4 text-white/70" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-white/70" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-white/50">Account Value</p>
              </div>
            </section>

            <section className="flex gap-2 mb-8">
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
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2">
        <div className="mx-auto max-w-sm md:max-w-md">
          <section className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <button className="flex items-center gap-2 text-white/90 hover:text-white transition">
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
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold">{formatCurrency(selectedStrategy.currentValue)}</p>
              <p className="text-sm text-emerald-400">
                ({selectedStrategy.previousMonthChange}% Previous Month)
              </p>
            </div>

            <div className="relative h-32 mb-2">
              <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.5)" />
                    <stop offset="50%" stopColor="rgba(168, 85, 247, 0.8)" />
                    <stop offset="100%" stopColor="rgba(139, 92, 246, 0.5)" />
                  </linearGradient>
                  <linearGradient id="highlightGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="rgba(250, 204, 21, 0)" />
                    <stop offset="50%" stopColor="rgba(250, 204, 21, 0.6)" />
                    <stop offset="100%" stopColor="rgba(250, 204, 21, 1)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
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

            <div className="flex justify-between text-xs text-white/40 px-1">
              {currentChartData.map((d, i) => (
                <span 
                  key={i} 
                  className={d.highlighted ? "text-yellow-400 font-semibold" : ""}
                >
                  {d.day || d.label}
                </span>
              ))}
            </div>
          </section>

          <button className="w-full py-3.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-semibold text-white/90 mb-6 transition hover:bg-white/15">
            View All Allocations
          </button>

          <section className="rounded-3xl bg-white p-5 mb-4 shadow-xl">
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

          <section className="rounded-3xl bg-white p-5 mb-8 shadow-xl">
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
    </div>
  );
};

export default NewPortfolioPage;
