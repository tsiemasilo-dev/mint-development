import React, { useState } from "react";
import { Bell, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { Area, ComposedChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

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

  const formatCurrency = (value) => {
    return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const goal = goals[0];
  const goalProgress = (goal.current / goal.target) * 100;

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] text-white relative overflow-hidden">
      {/* Seamless purple gradient background - dark purple to soft lavender */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient: continuous dark purple → royal purple → soft lavender */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(180deg, #0d0a14 0%, #12101c 5%, #1a1230 12%, #251845 20%, #2f1d58 28%, #3d256a 36%, #4c2e7c 44%, #5a378d 52%, #6b429e 60%, #7d4faf 68%, #8f5ebf 76%, #a070cc 84%, #b085d8 92%, #c09de3 100%)'
          }} 
        />
        
        {/* Soft purple ambient glow behind chart peak area */}
        <div 
          className="absolute top-[52%] left-[55%] w-[280px] h-[320px] -translate-x-1/2 -translate-y-1/2"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.5) 0%, rgba(139,92,246,0.35) 25%, rgba(124,58,237,0.2) 50%, transparent 75%)', 
            filter: 'blur(50px)' 
          }}
        />
        
        {/* Secondary purple bloom - wider and softer */}
        <div 
          className="absolute top-[48%] left-1/2 w-[400px] h-[280px] -translate-x-1/2 -translate-y-1/2"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(196,181,253,0.35) 0%, rgba(167,139,250,0.2) 35%, transparent 70%)', 
            filter: 'blur(60px)' 
          }}
        />
        
        {/* Vertical light beam effect behind chart peak */}
        <div 
          className="absolute top-[40%] left-[55%] w-[80px] h-[200px] -translate-x-1/2"
          style={{ 
            background: 'linear-gradient(180deg, transparent 0%, rgba(196,181,253,0.4) 30%, rgba(221,214,254,0.5) 50%, rgba(196,181,253,0.4) 70%, transparent 100%)', 
            filter: 'blur(30px)' 
          }}
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
        <section className="py-2">
          <div className="flex items-center justify-between mb-4 px-1">
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
                      ? "bg-white/20 text-white shadow-lg shadow-purple-500/20 backdrop-blur-sm"
                      : "text-white/50 hover:text-white/80 hover:bg-white/10"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 px-1">
            <p className="text-2xl font-bold text-white">{formatCurrency(selectedStrategy.currentValue)}</p>
            <p className="text-sm text-emerald-400 font-medium">
              +{selectedStrategy.previousMonthChange}% Previous Month
            </p>
          </div>

          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart
                data={currentChartData}
                margin={{ top: 30, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="purpleLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="30%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="70%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </radialGradient>
                </defs>
                
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
                  tickMargin={12}
                />
                
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl px-4 py-2 shadow-2xl border border-purple-400/30"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.95) 100%)',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          <div className="text-sm font-bold text-white">
                            R{payload[0].value.toLocaleString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={false}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#purpleLineGradient)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 8,
                    fill: 'url(#dotGlow)',
                    stroke: '#c4b5fd',
                    strokeWidth: 3,
                    style: { filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.8))' }
                  }}
                  style={{ filter: 'url(#purpleGlow)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <button className="w-full py-3.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-semibold uppercase tracking-[0.1em] text-white border border-white/20 shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-xl">
          View All Allocations
        </button>

        <section className="rounded-3xl bg-white/10 backdrop-blur-md p-5 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Linked Goals</p>
            <button className="flex items-center gap-1 text-xs font-medium text-purple-200 hover:text-white transition">
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">{goal.name}</p>
              <p className="text-sm font-semibold text-white/90">
                {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
              </p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-300 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              {goalProgress.toFixed(0)}% of your goal achieved
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white/10 backdrop-blur-md p-5 border border-white/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">Portfolio Holdings</p>
          </div>
          <p className="text-xs text-white/50 mb-4">Top holdings by weight</p>
          
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div 
                key={holding.symbol}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 overflow-hidden">
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
                      className={`text-xs font-bold text-white/70 ${holding.logo ? 'hidden' : 'flex'}`}
                    >
                      {holding.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{holding.symbol}</p>
                    <p className="text-xs text-white/60">{holding.name}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white/90">
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
