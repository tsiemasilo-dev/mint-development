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
        {/* Base gradient: seamless purple to lavender to white transition - white starts at pill buttons */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 1%, #100b18 2%, #120c1c 3%, #150e22 4%, #181028 5%, #1c122f 6%, #201436 7%, #25173e 8%, #2a1a46 9%, #301d4f 10%, #362158 11%, #3d2561 12%, #44296b 13%, #4c2e75 14%, #54337f 15%, #5d3889 16%, #663e93 17%, #70449d 18%, #7a4aa7 19%, #8451b0 20%, #8e58b9 21%, #9860c1 22%, #a268c8 23%, #ac71ce 24%, #b57ad3 25%, #be84d8 26%, #c68edc 27%, #cd98e0 28%, #d4a2e3 29%, #daace6 30%, #dfb6e9 31%, #e4c0eb 32%, #e8c9ed 33%, #ecd2ef 34%, #efdaf1 35%, #f2e1f3 36%, #f4e7f5 38%, #f6ecf7 40%, #f8f0f9 42%, #f9f3fa 45%, #faf5fb 48%, #fbf7fc 52%, #fcf9fd 58%, #fcfafd 100%)'
          }} 
        />
        
        {/* Subtle ambient glow behind account balance */}
        <div 
          className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.15) 0%, rgba(76,29,149,0.08) 40%, transparent 70%)', filter: 'blur(50px)' }}
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
            <button className="flex items-center gap-2 text-slate-900 hover:text-slate-700 transition">
              <span className="text-base font-bold">{selectedStrategy.name}</span>
              <ChevronDown className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {["D", "W", "M", "A"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                    timeFilter === filter
                      ? "bg-slate-900 text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 px-1">
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(selectedStrategy.currentValue)}</p>
            <p className="text-sm text-emerald-600 font-semibold">
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
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
                    <stop offset="3%" stopColor="#a78bfa" stopOpacity="0.3" />
                    <stop offset="8%" stopColor="#8b5cf6" stopOpacity="0.7" />
                    <stop offset="15%" stopColor="#7c3aed" stopOpacity="0.9" />
                    <stop offset="25%" stopColor="#7c3aed" stopOpacity="1" />
                    <stop offset="75%" stopColor="#7c3aed" stopOpacity="1" />
                    <stop offset="85%" stopColor="#7c3aed" stopOpacity="0.9" />
                    <stop offset="92%" stopColor="#8b5cf6" stopOpacity="0.7" />
                    <stop offset="97%" stopColor="#a78bfa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>
                  
                  <linearGradient id="glowGradientVertical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="20%" stopColor="#8b5cf6" stopOpacity="0.15" />
                    <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.08" />
                    <stop offset="80%" stopColor="#c4b5fd" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
                  </linearGradient>
                  
                  <linearGradient id="glowOpacityMask" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="5%" stopColor="white" stopOpacity="0.2" />
                    <stop offset="15%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="35%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="white" stopOpacity="1" />
                    <stop offset="65%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="85%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="95%" stopColor="white" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  
                  <mask id="glowMask">
                    <rect x="0" y="0" width="100%" height="100%" fill="url(#glowOpacityMask)" />
                  </mask>
                  
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#8b5cf6" floodOpacity="0.5" />
                  </filter>
                  
                  <filter id="areaBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
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

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="transparent"
                  fill="url(#glowGradientVertical)"
                  fillOpacity={1}
                  mask="url(#glowMask)"
                  style={{ filter: 'url(#areaBlur)' }}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#purpleLineGradient)"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{
                    r: 7,
                    fill: '#a78bfa',
                    stroke: '#c4b5fd',
                    strokeWidth: 2,
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
