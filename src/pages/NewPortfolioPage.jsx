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
      {/* Multi-layer gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient: deep purple extends further down */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(180deg, #0d0d12 0%, #0f0a18 5%, #120c1f 10%, #1a1035 16%, #251548 22%, #2d1860 28%, #3b2066 34%, #5b3490 42%, #7c5aad 50%, #a88bc7 56%, #c9b5dc 62%, #ddd0e8 68%, #ebe4f2 74%, #f3eff8 80%, #f8f5fb 88%, #faf8fc 100%)'
          }} 
        />
        
        {/* Mid-section indigo/royal purple glow - positioned around chart start */}
        <div 
          className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[150%] h-[36%] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.4) 0%, rgba(76,29,149,0.2) 35%, transparent 65%)' }}
        />
        
        {/* Large radial ambient glow behind account balance */}
        <div 
          className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.2) 0%, rgba(76,29,149,0.1) 40%, transparent 70%)', filter: 'blur(40px)' }}
        />
        
        
        {/* Subtle surface reflection/gloss in the middle-lower area */}
        <div 
          className="absolute top-[52%] left-0 right-0 h-[48%]"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(237,233,254,0.3) 12%, rgba(248,245,251,0.6) 30%, rgba(250,248,252,0.85) 50%, rgba(252,250,253,0.95) 70%, #fcfafd 100%)' }}
        />
        <div 
          className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[130%] h-[60px] rounded-full"
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

          <div className="relative -mx-4 md:-mx-8" style={{ height: 220 }}>
            <div 
              className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, rgba(124,90,173,1) 0%, rgba(124,90,173,0.8) 30%, rgba(124,90,173,0.3) 60%, transparent 100%)' }}
            />
            <div 
              className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(270deg, rgba(124,90,173,1) 0%, rgba(124,90,173,0.8) 30%, rgba(124,90,173,0.3) 60%, transparent 100%)' }}
            />
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={currentChartData}
                margin={{ top: 40, right: 0, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="purpleLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="8%" stopColor="#a78bfa" />
                    <stop offset="25%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="75%" stopColor="#8b5cf6" />
                    <stop offset="92%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.7" />
                  </filter>
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
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{
                    r: 8,
                    fill: '#a78bfa',
                    stroke: '#c4b5fd',
                    strokeWidth: 3,
                  }}
                  style={{ filter: 'url(#lineGlow)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
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
