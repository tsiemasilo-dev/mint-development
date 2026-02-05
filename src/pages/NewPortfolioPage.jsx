import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bell, Eye, EyeOff, ChevronDown, ChevronRight, ArrowLeft, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Area, ComposedChart, Line, XAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useFinancialData } from "../lib/useFinancialData";
import { useProfile } from "../lib/useProfile";
import { useUserStrategies, useStrategyChartData } from "../lib/useUserStrategies";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MOCK_CALENDAR_RETURNS = {
  "2025": {
    "01": 0.032,
    "02": -0.018,
    "03": 0.045,
    "04": 0.021,
    "05": -0.008,
    "06": 0.038,
    "07": 0.015,
    "08": -0.025,
    "09": 0.042,
    "10": 0.028,
    "11": 0.019,
    "12": 0.035,
  },
  "2024": {
    "01": 0.028,
    "02": 0.015,
    "03": -0.012,
    "04": 0.033,
    "05": 0.041,
    "06": -0.005,
    "07": 0.022,
    "08": 0.018,
    "09": -0.015,
    "10": 0.038,
    "11": 0.025,
    "12": 0.045,
  },
};

const getReturnColor = (value) => {
  if (value == null) return "bg-slate-50 text-slate-600";
  if (value > 0) return "bg-emerald-50 text-emerald-600";
  if (value < 0) return "bg-rose-50 text-rose-600";
  return "bg-slate-50 text-slate-600";
};

const MOCK_ALLOCATIONS = [
  {
    id: 1,
    amount: 2500.00,
    returnPercent: 8.2,
    date: "2025-02-01",
    topPerformers: [
      { symbol: "NED", logo: "/logos/nedbank.jpg", return: 12.5 },
      { symbol: "SBK", logo: "/logos/standard-bank.jpg", return: 9.8 },
      { symbol: "SUN", logo: "/logos/sun-international.jpg", return: 7.2 },
    ],
  },
  {
    id: 2,
    amount: 1500.00,
    returnPercent: 15.4,
    date: "2025-01-15",
    topPerformers: [
      { symbol: "SBK", logo: "/logos/standard-bank.jpg", return: 18.3 },
      { symbol: "EXP", logo: "/logos/exemplar-reit.jpg", return: 14.1 },
      { symbol: "NED", logo: "/logos/nedbank.jpg", return: 11.9 },
    ],
  },
  {
    id: 3,
    amount: 3000.00,
    returnPercent: 21.5,
    date: "2024-12-20",
    topPerformers: [
      { symbol: "SUN", logo: "/logos/sun-international.jpg", return: 25.6 },
      { symbol: "NED", logo: "/logos/nedbank.jpg", return: 19.4 },
      { symbol: "SBK", logo: "/logos/standard-bank.jpg", return: 16.8 },
    ],
  },
  {
    id: 4,
    amount: 5000.00,
    returnPercent: 12.8,
    date: "2024-11-05",
    topPerformers: [
      { symbol: "EXP", logo: "/logos/exemplar-reit.jpg", return: 15.2 },
      { symbol: "SBK", logo: "/logos/standard-bank.jpg", return: 13.1 },
      { symbol: "SUN", logo: "/logos/sun-international.jpg", return: 10.5 },
    ],
  },
  {
    id: 5,
    amount: 2000.00,
    returnPercent: 5.3,
    date: "2024-09-18",
    topPerformers: [
      { symbol: "NED", logo: "/logos/nedbank.jpg", return: 8.4 },
      { symbol: "EXP", logo: "/logos/exemplar-reit.jpg", return: 6.2 },
      { symbol: "SBK", logo: "/logos/standard-bank.jpg", return: 4.1 },
    ],
  },
];

const MOCK_STOCKS = [
  { id: 1, name: "Apple Inc.", ticker: "AAPL", shares: 15, price: 185.42, dailyChange: 2.35 },
  { id: 2, name: "Microsoft Corp.", ticker: "MSFT", shares: 8, price: 378.91, dailyChange: -0.87 },
  { id: 3, name: "Amazon.com Inc.", ticker: "AMZN", shares: 12, price: 178.25, dailyChange: 1.52 },
  { id: 4, name: "Tesla Inc.", ticker: "TSLA", shares: 20, price: 248.50, dailyChange: -2.14 },
  { id: 5, name: "Alphabet Inc.", ticker: "GOOGL", shares: 10, price: 141.80, dailyChange: 0.95 },
];


const MOCK_DATA = {
  accountValue: 24897.43,
  selectedStrategy: {
    name: "Balanced Growth",
    currentValue: 4449.30,
    previousMonthChange: 21,
  },
  chartData: {
    daily: [
      { day: "12am", value: 4320 },
      { day: "1am", value: 4310 },
      { day: "2am", value: 4330 },
      { day: "3am", value: 4350 },
      { day: "4am", value: 4360 },
      { day: "5am", value: 4370 },
      { day: "6am", value: 4380 },
      { day: "7am", value: 4400 },
      { day: "8am", value: 4410 },
      { day: "9am", value: 4420 },
      { day: "10am", value: 4450 },
      { day: "11am", value: 4480 },
      { day: "12pm", value: 4510, highlighted: true },
      { day: "1pm", value: 4520 },
      { day: "2pm", value: 4500 },
      { day: "3pm", value: 4480 },
      { day: "4pm", value: 4460 },
      { day: "5pm", value: 4450 },
      { day: "6pm", value: 4449 },
      { day: "7pm", value: 4455 },
      { day: "8pm", value: 4458 },
      { day: "9pm", value: 4460 },
      { day: "10pm", value: 4465 },
      { day: "11pm", value: 4470 },
    ],
    weekly: [
      { day: "Sat", value: 3200 },
      { day: "Sun", value: 3800 },
      { day: "Mon", value: 4100 },
      { day: "Tue", value: 4720, highlighted: true },
      { day: "Wed", value: 4200 },
      { day: "Thu", value: 4449 },
      { day: "Fri", value: 4600 },
    ],
    monthly: [
      { day: "1", value: 3500 },
      { day: "2", value: 3520 },
      { day: "3", value: 3550 },
      { day: "4", value: 3580 },
      { day: "5", value: 3650 },
      { day: "6", value: 3700 },
      { day: "7", value: 3750 },
      { day: "8", value: 3800 },
      { day: "9", value: 3850 },
      { day: "10", value: 3900 },
      { day: "11", value: 3950 },
      { day: "12", value: 4000 },
      { day: "13", value: 4050 },
      { day: "14", value: 4100 },
      { day: "15", value: 4200, highlighted: true },
      { day: "16", value: 4180 },
      { day: "17", value: 4150 },
      { day: "18", value: 4120 },
      { day: "19", value: 4100 },
      { day: "20", value: 4150 },
      { day: "21", value: 4200 },
      { day: "22", value: 4250 },
      { day: "23", value: 4280 },
      { day: "24", value: 4300 },
      { day: "25", value: 4350 },
      { day: "26", value: 4380 },
      { day: "27", value: 4400 },
      { day: "28", value: 4420 },
      { day: "29", value: 4435 },
      { day: "30", value: 4449 },
    ],
    allTime: [
      { day: "Jan '24", value: 2800 },
      { day: "Feb '24", value: 2900 },
      { day: "Mar '24", value: 3050 },
      { day: "Apr '24", value: 3200 },
      { day: "May '24", value: 3400 },
      { day: "Jun '24", value: 3550 },
      { day: "Jul '24", value: 3800 },
      { day: "Aug '24", value: 3900 },
      { day: "Sep '24", value: 3950 },
      { day: "Oct '24", value: 4100 },
      { day: "Nov '24", value: 4200 },
      { day: "Dec '24", value: 4300 },
      { day: "Jan '25", value: 4449, highlighted: true },
      { day: "Feb '25", value: 4600 },
    ],
  },
  goals: [
    { name: "First Home", current: 150000, target: 500000 },
  ],
};

const NewPortfolioPage = () => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("strategy");
  const [timeFilter, setTimeFilter] = useState("W");
  const [failedLogos, setFailedLogos] = useState({});
  const [calendarYear, setCalendarYear] = useState(2025);
  const [currentView, setCurrentView] = useState("portfolio");
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const chartScrollRef = useRef(null);
  const dropdownRef = useRef(null);
  const { profile } = useProfile();
  const { strategies, selectedStrategy: userSelectedStrategy, loading: strategiesLoading, selectStrategy } = useUserStrategies();
  const { chartData: realChartData, loading: chartLoading } = useStrategyChartData(userSelectedStrategy?.strategyId, timeFilter);
  
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User";
  
  const isStrategyReady = !strategiesLoading && userSelectedStrategy;
  const currentStrategy = userSelectedStrategy || {
    name: strategiesLoading ? "Loading..." : "No Strategy",
    currentValue: 0,
    previousMonthChange: 0,
  };

  const getChartWidth = (dataLength) => {
    const minWidth = 100;
    const pointSpacing = timeFilter === "W" ? 70 : 50;
    return Math.max(minWidth, dataLength * pointSpacing);
  };

  useEffect(() => {
    if (chartScrollRef.current) {
      const scrollContainer = chartScrollRef.current;
      const chartWidth = scrollContainer.scrollWidth;
      const containerWidth = scrollContainer.clientWidth;
      const scrollTo = (chartWidth - containerWidth) * 0.6;
      scrollContainer.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, [timeFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStrategyDropdown(false);
      }
    };
    if (showStrategyDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStrategyDropdown]);

  const handleStrategySelect = (strategy) => {
    selectStrategy(strategy);
    setShowStrategyDropdown(false);
  };

  const availableCalendarYears = useMemo(() => Object.keys(MOCK_CALENDAR_RETURNS).sort(), []);
  const calendarData = MOCK_CALENDAR_RETURNS;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  };

  const { holdings: rawHoldings, loading: holdingsLoading, investments } = useFinancialData();
  const { accountValue, chartData, goals } = MOCK_DATA;
  
  const displayAccountValue = strategies.length > 0 
    ? strategies.reduce((sum, s) => sum + (s.currentValue || 0), 0) 
    : accountValue;

  const holdings = rawHoldings.length > 0 
    ? rawHoldings.map(h => {
        const totalValue = rawHoldings.reduce((sum, holding) => sum + (holding.current_value || 0), 0);
        const weight = totalValue > 0 ? ((h.current_value || 0) / totalValue) * 100 : 0;
        return {
          symbol: h.securities?.symbol || h.symbol || "N/A",
          name: h.securities?.name || h.name || "Unknown",
          weight: weight,
          logo: h.securities?.logo_url || null,
        };
      }).sort((a, b) => b.weight - a.weight).slice(0, 5)
    : [
        { symbol: "NED.JO", name: "Nedbank Group", weight: 13.9, logo: "/logos/nedbank.jpg" },
        { symbol: "SUI.JO", name: "Sun International", weight: 16.8, logo: "/logos/sun-international.jpg" },
        { symbol: "EXP.JO", name: "Exemplar REITail Ltd.", weight: 19.0, logo: "/logos/exemplar-reit.jpg" },
        { symbol: "SBK.JO", name: "Standard Bank Group", weight: 12.5, logo: "/logos/standard-bank.jpg" },
      ];

  const getChartData = () => {
    if (realChartData && realChartData.length > 0) {
      return realChartData;
    }
    switch (timeFilter) {
      case "D": return chartData.daily;
      case "W": return chartData.weekly;
      case "M": return chartData.monthly;
      case "ALL": return chartData.allTime;
      default: return chartData.weekly;
    }
  };

  const currentChartData = getChartData();
  const isLoadingData = strategiesLoading || chartLoading;

  const formatCurrency = (value) => {
    return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const goal = goals[0];
  const goalProgress = (goal.current / goal.target) * 100;

  // All Allocations View
  if (currentView === "allocations") {
    return (
      <div className="min-h-screen pb-[env(safe-area-inset-bottom)] text-white relative overflow-x-hidden">
        {/* Gradient background - same as portfolio page */}
        <div className="absolute inset-x-0 top-0 -z-10 h-full">
          <div 
            className="absolute inset-x-0 top-0"
            style={{ 
              height: '100vh',
              background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
            }} 
          />
          <div 
            className="absolute inset-x-0 top-[100vh] bottom-0"
            style={{ background: '#f8f6fa' }} 
          />
        </div>

        {/* Header */}
        <div className="mx-auto flex w-full max-w-sm flex-col px-4 pt-12 md:max-w-md md:px-6">
          <header className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setCurrentView("portfolio")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg transition hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">{currentStrategy.name || "Strategy"} Allocations</h1>
          </header>
        </div>

        {/* Allocation History Cards - sorted most recent first */}
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-6">
          {[...MOCK_ALLOCATIONS].sort((a, b) => new Date(b.date) - new Date(a.date)).map((allocation) => (
            <div 
              key={allocation.id}
              className="rounded-3xl p-5 backdrop-blur-xl shadow-sm border border-slate-100/50"
              style={{
                background: 'rgba(255,255,255,0.7)',
              }}
            >
              {/* Amount and Return */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Amount</p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(allocation.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Return</p>
                  <p className={`text-xl font-bold ${allocation.returnPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {allocation.returnPercent >= 0 ? '+' : ''}{allocation.returnPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Date and Top Performers Logos */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(allocation.date)}
                  </p>
                </div>
                
                {/* Overlapping Top Performers Logos */}
                <div className="flex items-center -space-x-2">
                  {allocation.topPerformers.slice(0, 3).map((asset, index) => (
                    <div 
                      key={asset.symbol}
                      className="h-9 w-9 rounded-full bg-white border-2 border-white shadow-md overflow-hidden"
                      style={{ zIndex: 3 - index }}
                    >
                      {failedLogos[asset.symbol] ? (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100 text-[10px] font-bold text-violet-700">
                          {asset.symbol.slice(0, 2)}
                        </div>
                      ) : (
                        <img
                          src={asset.logo}
                          alt={asset.symbol}
                          className="h-full w-full object-cover"
                          onError={() => setFailedLogos(prev => ({ ...prev, [asset.symbol]: true }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] text-white relative overflow-x-hidden">
      {/* Gradient background - scrolls with content */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        {/* Base gradient: seamless purple to lavender to white transition using vh units for consistent position */}
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
        {/* Continuation for rest of page - matches end of gradient */}
        <div 
          className="absolute inset-x-0 top-[100vh] bottom-0"
          style={{ background: '#f8f6fa' }} 
        />
        
        {/* Subtle ambient glow behind account balance */}
        <div 
          className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full"
          style={{ background: 'radial-gradient(ellipse at center, rgba(91,33,182,0.15) 0%, rgba(76,29,149,0.08) 40%, transparent 70%)', filter: 'blur(50px)' }}
        />
      </div>

      {/* Header section */}
      <div className="relative px-5 pb-6 pt-10 md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 md:max-w-md">
          {/* Top row: Avatar stacked with greeting, notification on right */}
          <header className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-amber-400 text-sm font-semibold text-amber-900 shadow-lg shadow-amber-500/20">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" 
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerText = 'JD'; }}
                />
              </div>
              <p className="text-lg font-medium text-white/90 mt-1">{fullName}</p>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 backdrop-blur-sm transition hover:bg-white/10">
              <Bell className="h-5 w-5 text-white/90" />
            </button>
          </header>

          {/* Account balance */}
          <section className="relative">
            <div className="absolute -inset-8 bg-gradient-radial from-[#7c3aed]/20 via-transparent to-transparent rounded-full blur-2xl -z-10" />
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold tracking-tight" style={{ minWidth: '180px' }}>
                R{balanceVisible ? displayAccountValue.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "••••••••"}
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
              >
                {balanceVisible ? (
                  <Eye className="h-4 w-4 text-white/50" />
                ) : (
                  <EyeOff className="h-4 w-4 text-white/50" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-white/40">Account Value</p>
          </section>

          {/* Tabs: Strategy, Individual Stocks, Goals */}
          <section className="flex gap-2 mt-1">
            {[
              { id: "strategy", label: "Strategies" },
              { id: "stocks", label: "Individual Stocks" },
              { id: "holdings", label: "Holdings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                    : "border border-white/40 text-white/90 backdrop-blur-sm hover:bg-white/15"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </section>
        </div>
      </div>

      {/* Strategy Tab Content */}
      {activeTab === "strategy" && (
        <>
          {/* Chart section */}
          <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 md:max-w-md md:px-8">
        <section className="py-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                className="flex items-center gap-2 text-slate-900 hover:text-slate-700 transition"
              >
                <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
                  {currentStrategy.name || "Strategy"}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showStrategyDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showStrategyDropdown && strategies.length > 0 && (
                <div 
                  className="absolute top-full left-0 mt-2 min-w-[200px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 z-50 overflow-hidden"
                  style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.strategyId}
                      onClick={() => handleStrategySelect(strategy)}
                      className={`w-full px-4 py-3.5 text-left hover:bg-purple-50/50 transition-colors duration-150 border-b border-slate-100/50 last:border-b-0 ${
                        userSelectedStrategy?.strategyId === strategy.strategyId ? 'bg-purple-50' : ''
                      }`}
                    >
                      <p className="font-medium text-slate-800 text-sm tracking-tight">{strategy.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium tabular-nums">
                        R{(strategy.currentValue || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {[
                { id: "D", label: "D" },
                { id: "W", label: "W" },
                { id: "M", label: "M" },
                { id: "ALL", label: "All" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTimeFilter(filter.id)}
                  className={`px-3 h-9 rounded-full text-sm font-bold transition-all ${
                    timeFilter === filter.id
                      ? "bg-slate-700/80 text-white shadow-lg backdrop-blur-md border border-white/20"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/30"
                  }`}
                  style={timeFilter === filter.id ? {
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.15)'
                  } : {}}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 px-1">
            <p className="text-3xl font-bold text-slate-900">R{(currentStrategy.currentValue || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
            <p className="text-sm text-emerald-500">
              ({currentStrategy.previousMonthChange || 0}% Previous Month)
            </p>
          </div>

          <div 
            ref={chartScrollRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ 
              width: '100%', 
              height: 220, 
              marginBottom: 8,
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              overflowY: 'hidden',
            }}
            onTouchStart={(e) => e.currentTarget.style.cursor = 'grabbing'}
            onTouchEnd={(e) => e.currentTarget.style.cursor = 'grab'}
          >
            <div style={{ width: getChartWidth(currentChartData.length), height: 220, minWidth: '100%', outline: 'none' }}>
              <ComposedChart
                width={getChartWidth(currentChartData.length)}
                height={220}
                data={currentChartData}
                margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
                style={{ outline: 'none' }}
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
                  tickMargin={20}
                  tick={({ x, y, payload, index }) => {
                    const isHighlighted = currentChartData[index]?.highlighted;
                    const totalItems = currentChartData.length;
                    const isEdge = index === 0 || index === totalItems - 1;
                    const opacity = isEdge ? 0.6 : 1;
                    
                    return (
                      <g transform={`translate(${x},${y})`} style={{ opacity }}>
                        {isHighlighted ? (
                          <>
                            <rect
                              x={-24}
                              y={-12}
                              width={48}
                              height={30}
                              rx={15}
                              fill="rgba(71, 85, 105, 0.75)"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                            />
                            <rect
                              x={-24}
                              y={-12}
                              width={48}
                              height={30}
                              rx={15}
                              fill="none"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={1}
                            />
                          </>
                        ) : null}
                        <text
                          x={0}
                          y={8}
                          textAnchor="middle"
                          fill={isHighlighted ? '#ffffff' : '#64748b'}
                          fontSize={14}
                          fontWeight={isHighlighted ? 700 : 600}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
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
                  wrapperStyle={{ outline: 'none' }}
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
            </div>
          </div>
        </section>
      </div>

      {/* Scrollable content section - starts after chart */}
      <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-8">
        <button 
          onClick={() => setCurrentView("allocations")}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          View All Allocations
        </button>

        <section className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50">
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

        <section className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50">
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
                    {failedLogos[holding.symbol] || !holding.logo ? (
                      <span className="text-xs font-bold text-slate-600">
                        {holding.symbol.slice(0, 3)}
                      </span>
                    ) : (
                      <img 
                        src={holding.logo} 
                        alt={holding.name}
                        className="h-8 w-8 object-contain"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={() => setFailedLogos(prev => ({ ...prev, [holding.symbol]: true }))}
                      />
                    )}
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

        {/* Calendar Returns */}
        <section className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm font-semibold text-slate-900">Calendar Returns</p>
            {availableCalendarYears.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {availableCalendarYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setCalendarYear(Number(year))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      Number(year) === Number(calendarYear)
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mb-3 text-xs font-semibold text-slate-500">{calendarYear}</p>
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((label, index) => {
              const monthKey = String(index + 1).padStart(2, "0");
              const value = calendarData[String(calendarYear)]?.[monthKey];
              return (
                <div
                  key={`${calendarYear}-${label}`}
                  className={`rounded-xl px-3 py-2.5 text-center ${getReturnColor(value)}`}
                >
                  <p className="text-[10px] font-semibold text-slate-500">{label}</p>
                  <p className="mt-0.5 text-sm font-bold">
                    {value == null ? "—" : `${(Number(value) * 100).toFixed(2)}%`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
        </>
      )}

      {/* Individual Stocks Tab Content */}
      {activeTab === "stocks" && (
        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-8">
          <div 
            className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50"
            style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Your Holdings</h3>
            <div className="space-y-4">
              {MOCK_STOCKS.map((stock) => {
                const totalValue = stock.shares * stock.price;
                const isPositive = stock.dailyChange >= 0;
                return (
                  <div 
                    key={stock.id}
                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                        <span className="text-sm font-bold text-violet-700">
                          {stock.ticker.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{stock.name}</p>
                        <p className="text-xs text-slate-500">{stock.ticker} · {stock.shares} shares</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(totalValue)}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-rose-600" />
                        )}
                        <p className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{stock.dailyChange.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Buy Stocks
          </button>
        </div>
      )}

      {/* Holdings Tab Content */}
      {activeTab === "holdings" && (() => {
        const holdingsData = [
          { id: 1, name: "Apple Inc.", ticker: "AAPL", logo: "https://logo.clearbit.com/apple.com", currentValue: 12450.80, change: 8.4, color: "#8B5CF6" },
          { id: 2, name: "Tesla Inc.", ticker: "TSLA", logo: "https://logo.clearbit.com/tesla.com", currentValue: 8920.50, change: -2.1, color: "#A78BFA" },
          { id: 3, name: "Microsoft Corp.", ticker: "MSFT", logo: "https://logo.clearbit.com/microsoft.com", currentValue: 6780.25, change: 5.7, color: "#C4B5FD" },
          { id: 4, name: "Amazon.com Inc.", ticker: "AMZN", logo: "https://logo.clearbit.com/amazon.com", currentValue: 4350.90, change: 3.2, color: "#DDD6FE" },
          { id: 5, name: "Alphabet Inc.", ticker: "GOOGL", logo: "https://logo.clearbit.com/google.com", currentValue: 3200.15, change: -0.8, color: "#EDE9FE" },
          { id: 6, name: "NVIDIA Corp.", ticker: "NVDA", logo: "https://logo.clearbit.com/nvidia.com", currentValue: 5680.40, change: 12.5, color: "#7C3AED" },
        ];
        const totalValue = holdingsData.reduce((sum, h) => sum + h.currentValue, 0);
        const totalDistinct = holdingsData.length;
        const pieData = holdingsData.map(h => ({ name: h.ticker, value: h.currentValue, color: h.color }));

        return (
        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-8">
          {/* Summary Card with Pie Chart */}
          <div 
            className="rounded-3xl p-5 backdrop-blur-xl shadow-sm border border-slate-100/50"
            style={{ background: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            <div className="flex items-center justify-between">
              {/* Left: Total Value and Distinct Count */}
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Total Holdings</p>
                  <p className="text-xl font-bold text-slate-900">{totalDistinct} <span className="text-sm font-normal text-slate-500">assets</span></p>
                </div>
              </div>
              
              {/* Right: Pie Chart */}
              <div className="relative h-28 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500">Weight</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Holdings List */}
          <div 
            className="space-y-3"
            style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            {holdingsData.map((stock) => (
              <div 
                key={stock.id}
                className="rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-sm border border-slate-100/50"
              >
                <div className="flex items-center gap-3">
                  {/* Stock Logo */}
                  <div className="h-11 w-11 rounded-full bg-white border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
                    {failedLogos[stock.ticker] ? (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100 text-xs font-bold text-violet-700">
                        {stock.ticker.slice(0, 2)}
                      </div>
                    ) : (
                      <img
                        src={stock.logo}
                        alt={stock.name}
                        className="h-full w-full object-cover"
                        onError={() => setFailedLogos(prev => ({ ...prev, [stock.ticker]: true }))}
                      />
                    )}
                  </div>
                  
                  {/* Stock Name and Ticker */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{stock.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{stock.ticker}</p>
                  </div>
                  
                  {/* Value and Performance */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(stock.currentValue)}
                    </p>
                    <p className={`text-xs font-medium ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default NewPortfolioPage;
