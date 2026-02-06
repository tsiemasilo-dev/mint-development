import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bell, Eye, EyeOff, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Area, ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useFinancialData } from "../lib/useFinancialData";
import { useProfile } from "../lib/useProfile";
import { useUserStrategies, useStrategyChartData } from "../lib/useUserStrategies";
import { useStockQuotes, useStockChart } from "../lib/useStockData";

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
  { id: 1, name: "Apple Inc.", ticker: "AAPL", shares: 15, price: 185.42, dailyChange: 2.35, logo: null },
  { id: 2, name: "Microsoft Corp.", ticker: "MSFT", shares: 8, price: 378.91, dailyChange: -0.87, logo: null },
  { id: 3, name: "Amazon.com Inc.", ticker: "AMZN", shares: 12, price: 178.25, dailyChange: 1.52, logo: null },
  { id: 4, name: "Tesla Inc.", ticker: "TSLA", shares: 20, price: 248.50, dailyChange: -2.14, logo: null },
  { id: 5, name: "Alphabet Inc.", ticker: "GOOGL", shares: 10, price: 141.80, dailyChange: 0.95, logo: null },
];

const MOCK_STOCK_CHART_DATA = {
  AAPL: {
    daily: [
      { day: "12am", value: 182.10 }, { day: "1am", value: 182.05 }, { day: "2am", value: 182.20 },
      { day: "3am", value: 182.35 }, { day: "4am", value: 182.50 }, { day: "5am", value: 182.80 },
      { day: "6am", value: 183.10 }, { day: "7am", value: 183.50 }, { day: "8am", value: 183.80 },
      { day: "9am", value: 184.20 }, { day: "10am", value: 184.60 }, { day: "11am", value: 184.90 },
      { day: "12pm", value: 185.20, highlighted: true }, { day: "1pm", value: 185.10 },
      { day: "2pm", value: 185.30 }, { day: "3pm", value: 185.25 }, { day: "4pm", value: 185.42 },
    ],
    weekly: [
      { day: "Mon", value: 181.20 }, { day: "Tue", value: 182.50 },
      { day: "Wed", value: 183.80, highlighted: true }, { day: "Thu", value: 184.10 },
      { day: "Fri", value: 185.42 },
    ],
    monthly: [
      { day: "1", value: 175.50 }, { day: "5", value: 176.80 }, { day: "8", value: 178.20 },
      { day: "12", value: 179.90 }, { day: "15", value: 180.50, highlighted: true },
      { day: "18", value: 181.30 }, { day: "22", value: 182.70 }, { day: "25", value: 184.10 },
      { day: "28", value: 185.00 }, { day: "30", value: 185.42 },
    ],
    allTime: [
      { day: "Jan '24", value: 155.00 }, { day: "Mar '24", value: 160.20 }, { day: "May '24", value: 165.50 },
      { day: "Jul '24", value: 170.80 }, { day: "Sep '24", value: 174.30 }, { day: "Nov '24", value: 178.60 },
      { day: "Jan '25", value: 182.90, highlighted: true }, { day: "Feb '25", value: 185.42 },
    ],
  },
  MSFT: {
    daily: [
      { day: "12am", value: 376.50 }, { day: "1am", value: 376.40 }, { day: "2am", value: 376.60 },
      { day: "3am", value: 376.80 }, { day: "4am", value: 377.00 }, { day: "5am", value: 377.30 },
      { day: "6am", value: 377.60 }, { day: "7am", value: 377.90 }, { day: "8am", value: 378.20 },
      { day: "9am", value: 378.50 }, { day: "10am", value: 378.80 }, { day: "11am", value: 379.10 },
      { day: "12pm", value: 379.50, highlighted: true }, { day: "1pm", value: 379.30 },
      { day: "2pm", value: 379.10 }, { day: "3pm", value: 378.95 }, { day: "4pm", value: 378.91 },
    ],
    weekly: [
      { day: "Mon", value: 380.20 }, { day: "Tue", value: 381.50 },
      { day: "Wed", value: 380.10, highlighted: true }, { day: "Thu", value: 379.50 },
      { day: "Fri", value: 378.91 },
    ],
    monthly: [
      { day: "1", value: 372.00 }, { day: "5", value: 373.50 }, { day: "8", value: 375.20 },
      { day: "12", value: 376.80 }, { day: "15", value: 378.00, highlighted: true },
      { day: "18", value: 379.10 }, { day: "22", value: 380.50 }, { day: "25", value: 379.80 },
      { day: "28", value: 379.20 }, { day: "30", value: 378.91 },
    ],
    allTime: [
      { day: "Jan '24", value: 340.00 }, { day: "Mar '24", value: 348.50 }, { day: "May '24", value: 355.20 },
      { day: "Jul '24", value: 362.80 }, { day: "Sep '24", value: 368.40 }, { day: "Nov '24", value: 374.90 },
      { day: "Jan '25", value: 380.20, highlighted: true }, { day: "Feb '25", value: 378.91 },
    ],
  },
  AMZN: {
    daily: [
      { day: "12am", value: 175.80 }, { day: "1am", value: 175.90 }, { day: "2am", value: 176.10 },
      { day: "3am", value: 176.30 }, { day: "4am", value: 176.50 }, { day: "5am", value: 176.80 },
      { day: "6am", value: 177.00 }, { day: "7am", value: 177.20 }, { day: "8am", value: 177.50 },
      { day: "9am", value: 177.80 }, { day: "10am", value: 178.00 }, { day: "11am", value: 178.10 },
      { day: "12pm", value: 178.30, highlighted: true }, { day: "1pm", value: 178.20 },
      { day: "2pm", value: 178.15 }, { day: "3pm", value: 178.20 }, { day: "4pm", value: 178.25 },
    ],
    weekly: [
      { day: "Mon", value: 174.50 }, { day: "Tue", value: 175.80 },
      { day: "Wed", value: 176.90, highlighted: true }, { day: "Thu", value: 177.50 },
      { day: "Fri", value: 178.25 },
    ],
    monthly: [
      { day: "1", value: 168.00 }, { day: "5", value: 169.50 }, { day: "8", value: 171.20 },
      { day: "12", value: 173.00 }, { day: "15", value: 174.50, highlighted: true },
      { day: "18", value: 175.80 }, { day: "22", value: 176.90 }, { day: "25", value: 177.50 },
      { day: "28", value: 178.00 }, { day: "30", value: 178.25 },
    ],
    allTime: [
      { day: "Jan '24", value: 145.00 }, { day: "Mar '24", value: 150.80 }, { day: "May '24", value: 155.50 },
      { day: "Jul '24", value: 160.20 }, { day: "Sep '24", value: 165.80 }, { day: "Nov '24", value: 171.40 },
      { day: "Jan '25", value: 175.90, highlighted: true }, { day: "Feb '25", value: 178.25 },
    ],
  },
  TSLA: {
    daily: [
      { day: "12am", value: 252.80 }, { day: "1am", value: 252.50 }, { day: "2am", value: 252.20 },
      { day: "3am", value: 251.80 }, { day: "4am", value: 251.50 }, { day: "5am", value: 251.00 },
      { day: "6am", value: 250.80 }, { day: "7am", value: 250.50 }, { day: "8am", value: 250.20 },
      { day: "9am", value: 249.80 }, { day: "10am", value: 249.50 }, { day: "11am", value: 249.20 },
      { day: "12pm", value: 249.00, highlighted: true }, { day: "1pm", value: 248.90 },
      { day: "2pm", value: 248.70 }, { day: "3pm", value: 248.60 }, { day: "4pm", value: 248.50 },
    ],
    weekly: [
      { day: "Mon", value: 255.80 }, { day: "Tue", value: 253.50 },
      { day: "Wed", value: 251.20, highlighted: true }, { day: "Thu", value: 250.00 },
      { day: "Fri", value: 248.50 },
    ],
    monthly: [
      { day: "1", value: 262.00 }, { day: "5", value: 260.50 }, { day: "8", value: 258.80 },
      { day: "12", value: 256.50 }, { day: "15", value: 254.20, highlighted: true },
      { day: "18", value: 252.80 }, { day: "22", value: 251.00 }, { day: "25", value: 249.80 },
      { day: "28", value: 249.00 }, { day: "30", value: 248.50 },
    ],
    allTime: [
      { day: "Jan '24", value: 220.00 }, { day: "Mar '24", value: 235.50 }, { day: "May '24", value: 245.80 },
      { day: "Jul '24", value: 260.20 }, { day: "Sep '24", value: 268.40 }, { day: "Nov '24", value: 258.90 },
      { day: "Jan '25", value: 252.80, highlighted: true }, { day: "Feb '25", value: 248.50 },
    ],
  },
  GOOGL: {
    daily: [
      { day: "12am", value: 140.20 }, { day: "1am", value: 140.25 }, { day: "2am", value: 140.30 },
      { day: "3am", value: 140.40 }, { day: "4am", value: 140.50 }, { day: "5am", value: 140.65 },
      { day: "6am", value: 140.80 }, { day: "7am", value: 140.95 }, { day: "8am", value: 141.10 },
      { day: "9am", value: 141.25 }, { day: "10am", value: 141.40 }, { day: "11am", value: 141.55 },
      { day: "12pm", value: 141.70, highlighted: true }, { day: "1pm", value: 141.65 },
      { day: "2pm", value: 141.72 }, { day: "3pm", value: 141.75 }, { day: "4pm", value: 141.80 },
    ],
    weekly: [
      { day: "Mon", value: 139.50 }, { day: "Tue", value: 140.20 },
      { day: "Wed", value: 140.80, highlighted: true }, { day: "Thu", value: 141.30 },
      { day: "Fri", value: 141.80 },
    ],
    monthly: [
      { day: "1", value: 135.00 }, { day: "5", value: 136.20 }, { day: "8", value: 137.50 },
      { day: "12", value: 138.40 }, { day: "15", value: 139.20, highlighted: true },
      { day: "18", value: 140.00 }, { day: "22", value: 140.80 }, { day: "25", value: 141.20 },
      { day: "28", value: 141.50 }, { day: "30", value: 141.80 },
    ],
    allTime: [
      { day: "Jan '24", value: 120.00 }, { day: "Mar '24", value: 124.50 }, { day: "May '24", value: 128.80 },
      { day: "Jul '24", value: 132.20 }, { day: "Sep '24", value: 135.40 }, { day: "Nov '24", value: 138.60 },
      { day: "Jan '25", value: 140.90, highlighted: true }, { day: "Feb '25", value: 141.80 },
    ],
  },
};


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
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockTimeFilter, setStockTimeFilter] = useState("W");
  const [myStocksPage, setMyStocksPage] = useState(0);
  const [otherStocksPage, setOtherStocksPage] = useState(0);
  const { securities: allSecurities, quotes: liveQuotes, loading: quotesLoading } = useStockQuotes();
  const stocksList = useMemo(() => {
    if (!allSecurities || allSecurities.length === 0) return MOCK_STOCKS;
    return allSecurities
      .filter(s => s.currentPrice != null)
      .map(s => ({
        id: s.id,
        name: s.name,
        ticker: s.symbol,
        shares: 0,
        price: s.currentPrice || 0,
        dailyChange: s.changePct || 0,
        logo: s.logo_url || null,
      }));
  }, [allSecurities]);
  const selectedSecurityId = useMemo(() => {
    if (!selectedStock?.ticker) return null;
    const match = liveQuotes[selectedStock.ticker];
    return match?.id || null;
  }, [selectedStock?.ticker, liveQuotes]);
  const { chartData: liveStockChartData, loading: stockChartLoading } = useStockChart(selectedSecurityId, stockTimeFilter);
  const dropdownRef = useRef(null);
  const stockDropdownRef = useRef(null);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(event.target)) {
        setShowStockDropdown(false);
      }
    };
    if (showStockDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStockDropdown]);

  useEffect(() => {
    if (!selectedStock && stocksList.length > 0) {
      setSelectedStock(stocksList[0]);
    }
  }, [stocksList, selectedStock]);

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

  const getStockChartData = () => {
    const stockData = MOCK_STOCK_CHART_DATA[selectedStock.ticker];
    if (!stockData) return [];
    switch (stockTimeFilter) {
      case "D": return stockData.daily;
      case "W": return stockData.weekly;
      case "M": return stockData.monthly;
      case "ALL": return stockData.allTime;
      default: return stockData.weekly;
    }
  };

  const getChartData = () => {
    if (realChartData && realChartData.length > 0) {
      return realChartData;
    }
    return [];
  };

  const currentChartData = getChartData();
  const isLoadingData = strategiesLoading || chartLoading;

  const formatCurrency = (value) => {
    return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const myStocks = useMemo(() => {
    if (!strategies || strategies.length === 0 || !stocksList || stocksList.length === 0) return [];
    const holdingSymbols = new Set();
    strategies.forEach(s => {
      if (Array.isArray(s.holdings)) {
        s.holdings.forEach(h => {
          if (h.symbol) holdingSymbols.add(h.symbol);
        });
      }
    });
    if (holdingSymbols.size === 0) return [];
    return stocksList.filter(stock => holdingSymbols.has(stock.ticker));
  }, [strategies, stocksList]);

  const myStockIds = useMemo(() => new Set(myStocks.map(s => s.id)), [myStocks]);

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

          <div style={{ width: '100%', height: 220, marginBottom: 8 }}>
            {currentChartData.length === 0 ? (
              <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-slate-400 text-sm">{isLoadingData ? 'Loading chart...' : 'No data available'}</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={currentChartData}
                  margin={{ top: 10, right: 15, left: 5, bottom: 30 }}
                >
                  <defs>
                    <linearGradient id="glowGradientVertical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    interval={currentChartData.length <= 7 ? 0 : Math.max(0, Math.ceil(currentChartData.length / 6) - 1)}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                    tickFormatter={(val) => {
                      if (val >= 10000) return `R${(val / 1000).toFixed(0)}k`;
                      if (val >= 1000) return `R${(val / 1000).toFixed(1)}k`;
                      if (val >= 100) return `R${val.toFixed(1)}`;
                      return `R${val.toFixed(2)}`;
                    }}
                    width={55}
                    tickCount={5}
                    domain={([dataMin, dataMax]) => {
                      const range = dataMax - dataMin;
                      const padding = range > 0 ? Math.max(range * 0.15, 0.5) : 1;
                      return [dataMin - padding, dataMax + padding];
                    }}
                  />
                  
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const fullDate = payload[0]?.payload?.fullDate || label;
                        return (
                          <div className="rounded-xl px-4 py-2 shadow-2xl border border-purple-400/30"
                            style={{
                              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.95) 100%)',
                              backdropFilter: 'blur(12px)',
                            }}
                          >
                            <div className="text-xs text-purple-200 mb-0.5">{fullDate}</div>
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
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: '#7c3aed',
                      stroke: '#c4b5fd',
                      strokeWidth: 2,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
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
      {activeTab === "stocks" && (() => {
        const stockChartData = liveStockChartData.length > 0 ? liveStockChartData : [];
        if (!selectedStock) {
          return <div className="text-center py-10 text-slate-500">Loading stocks...</div>;
        }
        const otherStocks = stocksList.filter(s => s.id !== selectedStock?.id && !myStockIds.has(s.id));
        return (
          <>
            <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 md:max-w-md md:px-8">
              <section className="py-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="relative" ref={stockDropdownRef}>
                    <button
                      onClick={() => setShowStockDropdown(!showStockDropdown)}
                      className="flex items-center gap-2 text-slate-900 hover:text-slate-700 transition"
                    >
                      <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
                        {selectedStock.name}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showStockDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showStockDropdown && (
                      <div
                        className="absolute top-full left-0 mt-2 min-w-[200px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 z-50 overflow-hidden"
                        style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
                      >
                        {stocksList.map((stock) => (
                          <button
                            key={stock.id}
                            onClick={() => { setSelectedStock(stock); setShowStockDropdown(false); }}
                            className={`w-full px-4 py-3.5 text-left hover:bg-purple-50/50 transition-colors duration-150 border-b border-slate-100/50 last:border-b-0 ${
                              selectedStock.id === stock.id ? 'bg-purple-50' : ''
                            }`}
                          >
                            <p className="font-medium text-slate-800 text-sm tracking-tight">{stock.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium tabular-nums">
                              {formatCurrency(liveQuotes[stock.ticker]?.price || stock.price)}
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
                        onClick={() => setStockTimeFilter(filter.id)}
                        className={`px-3 h-9 rounded-full text-sm font-bold transition-all ${
                          stockTimeFilter === filter.id
                            ? "bg-slate-700/80 text-white shadow-lg backdrop-blur-md border border-white/20"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/30"
                        }`}
                        style={stockTimeFilter === filter.id ? {
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.15)'
                        } : {}}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 px-1">
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(liveQuotes[selectedStock.ticker]?.price || selectedStock.price)}</p>
                  {(() => {
                    const change = liveQuotes[selectedStock.ticker]?.changePercent ?? selectedStock.dailyChange;
                    return (
                      <p className={`text-sm ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ({change >= 0 ? '+' : ''}{change.toFixed(2)}% Today)
                      </p>
                    );
                  })()}
                </div>

                <div style={{ width: '100%', height: 220, marginBottom: 8 }}>
                  {stockChartData.length === 0 ? (
                    <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="text-slate-400 text-sm">{stockChartLoading ? 'Loading chart...' : 'No data available'}</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart
                        data={stockChartData}
                        margin={{ top: 10, right: 15, left: 5, bottom: 30 }}
                      >
                        <defs>
                          <linearGradient id="stockGlowGradientVertical" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={8}
                          interval={stockChartData.length <= 7 ? 0 : Math.max(0, Math.ceil(stockChartData.length / 6) - 1)}
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                          tickFormatter={(val) => {
                            if (val >= 10000) return `R${(val / 1000).toFixed(0)}k`;
                            if (val >= 1000) return `R${(val / 1000).toFixed(1)}k`;
                            if (val >= 100) return `R${val.toFixed(1)}`;
                            return `R${val.toFixed(2)}`;
                          }}
                          width={55}
                          tickCount={5}
                          domain={([dataMin, dataMax]) => {
                            const range = dataMax - dataMin;
                            const padding = range > 0 ? Math.max(range * 0.15, 0.5) : 1;
                            return [dataMin - padding, dataMax + padding];
                          }}
                        />

                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const fullDate = payload[0]?.payload?.fullDate || label;
                              return (
                                <div className="rounded-xl px-4 py-2 shadow-2xl border border-purple-400/30"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.95) 100%)',
                                    backdropFilter: 'blur(12px)',
                                  }}
                                >
                                  <div className="text-xs text-purple-200 mb-0.5">{fullDate}</div>
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
                          fill="url(#stockGlowGradientVertical)"
                          fillOpacity={1}
                        />

                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#7c3aed"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={false}
                          activeDot={{
                            r: 6,
                            fill: '#7c3aed',
                            stroke: '#c4b5fd',
                            strokeWidth: 2,
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>
            </div>

            <div className="relative mx-auto flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md md:px-8">
              {myStocks.length > 0 && (() => {
                const STOCKS_PER_PAGE = 6;
                const myTotalPages = Math.ceil(myStocks.length / STOCKS_PER_PAGE);
                const myPagedStocks = myStocks.slice(myStocksPage * STOCKS_PER_PAGE, (myStocksPage + 1) * STOCKS_PER_PAGE);
                return (
                <section
                  className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50"
                  style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-900">My Stocks</p>
                    {myTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMyStocksPage(p => Math.max(0, p - 1))}
                          disabled={myStocksPage === 0}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition ${myStocksPage === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'}`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-medium text-slate-400 tabular-nums">{myStocksPage + 1}/{myTotalPages}</span>
                        <button
                          onClick={() => setMyStocksPage(p => Math.min(myTotalPages - 1, p + 1))}
                          disabled={myStocksPage >= myTotalPages - 1}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition ${myStocksPage >= myTotalPages - 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {myPagedStocks.map((stock) => {
                      const livePrice = liveQuotes[stock.ticker]?.price || stock.price;
                      const liveChange = liveQuotes[stock.ticker]?.changePercent ?? stock.dailyChange;
                      const isPositive = liveChange >= 0;
                      return (
                        <button
                          key={stock.id}
                          onClick={() => setSelectedStock(stock)}
                          className="w-full flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-sm border border-slate-100/50 transition hover:bg-white/90 text-left"
                        >
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{stock.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{stock.ticker}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(livePrice)}</p>
                            <p className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPositive ? '+' : ''}{liveChange.toFixed(2)}%
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
                );
              })()}

              {(() => {
                const STOCKS_PER_PAGE = 6;
                const otherTotalPages = Math.ceil(otherStocks.length / STOCKS_PER_PAGE);
                const otherPagedStocks = otherStocks.slice(otherStocksPage * STOCKS_PER_PAGE, (otherStocksPage + 1) * STOCKS_PER_PAGE);
                return (
              <section
                className="rounded-3xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-100/50"
                style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900">Other Stocks</p>
                  {otherTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOtherStocksPage(p => Math.max(0, p - 1))}
                        disabled={otherStocksPage === 0}
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition ${otherStocksPage === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">{otherStocksPage + 1}/{otherTotalPages}</span>
                      <button
                        onClick={() => setOtherStocksPage(p => Math.min(otherTotalPages - 1, p + 1))}
                        disabled={otherStocksPage >= otherTotalPages - 1}
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition ${otherStocksPage >= otherTotalPages - 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {otherPagedStocks.map((stock) => {
                    const livePrice = liveQuotes[stock.ticker]?.price || stock.price;
                    const liveChange = liveQuotes[stock.ticker]?.changePercent ?? stock.dailyChange;
                    const isPositive = liveChange >= 0;
                    return (
                      <button
                        key={stock.id}
                        onClick={() => setSelectedStock(stock)}
                        className="w-full flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-sm border border-slate-100/50 transition hover:bg-white/90 text-left"
                      >
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{stock.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{stock.ticker}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(livePrice)}</p>
                          <p className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{liveChange.toFixed(2)}%
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
                );
              })()}

              <button
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Buy More Stocks
              </button>
            </div>
          </>
        );
      })()}

      {/* Holdings Tab Content */}
      {activeTab === "holdings" && (() => {
        const pieColors = ["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE", "#7C3AED", "#6D28D9", "#5B21B6"];
        const holdingsData = myStocks.length > 0
          ? myStocks.map((s, idx) => {
              const liveChange = liveQuotes[s.ticker]?.changePercent ?? s.dailyChange ?? 0;
              const livePrice = liveQuotes[s.ticker]?.price || s.price || 0;
              return {
                id: s.id,
                name: s.name,
                ticker: s.ticker,
                logo: s.logo,
                currentValue: livePrice * (s.shares || 1),
                change: liveChange,
                color: pieColors[idx % pieColors.length],
              };
            })
          : stocksList.slice(0, 6).map((s, idx) => {
              const liveChange = liveQuotes[s.ticker]?.changePercent ?? s.dailyChange ?? 0;
              const livePrice = liveQuotes[s.ticker]?.price || s.price || 0;
              return {
                id: s.id,
                name: s.name,
                ticker: s.ticker,
                logo: s.logo,
                currentValue: livePrice * (s.shares || 1),
                change: liveChange,
                color: pieColors[idx % pieColors.length],
              };
            });
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
              <div className="relative h-44 w-44 -mr-2 md:mr-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={1.5}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          opacity={activePieIndex >= 0 && activePieIndex !== index ? 0.4 : 1}
                          style={{ 
                            transform: activePieIndex === index 
                              ? 'scale(1.1)' 
                              : activePieIndex >= 0 
                                ? 'scale(0.94)' 
                                : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.5s ease-out, filter 0.5s ease-out',
                            cursor: 'pointer',
                            filter: activePieIndex === index ? 'url(#glow)' : 'none'
                          }}
                          onMouseEnter={() => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(-1)}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      wrapperStyle={{ outline: 'none', zIndex: 100 }}
                      position={{ x: -80, y: -10 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const percent = ((data.value / totalValue) * 100).toFixed(1);
                          return (
                            <div 
                              className="px-3 py-2 rounded-xl shadow-2xl border border-white/20"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                minWidth: '70px',
                                textAlign: 'center'
                              }}
                            >
                              <p className="text-xs font-bold text-slate-800">{data.name}</p>
                              <p className="text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                                {percent}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                  <div className="h-11 w-11 rounded-full bg-white border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
                    {!stock.logo || failedLogos[stock.ticker] ? (
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
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{stock.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{stock.ticker}</p>
                  </div>
                  
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
