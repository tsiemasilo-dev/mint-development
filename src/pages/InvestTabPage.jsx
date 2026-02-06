import React, { useState, useEffect } from "react";
import { Eye, EyeOff, TrendingUp, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "../lib/supabase";
import NotificationBell from "../components/NotificationBell";
import { useProfile } from "../lib/useProfile";

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (absNum / 1e9).toFixed(1) + "b";
  else if (absNum >= 1e6) formatted = (absNum / 1e6).toFixed(1) + "m";
  else if (absNum >= 1e3) formatted = (absNum / 1e3).toFixed(1) + "k";
  else formatted = absNum.toFixed(0);
  return `${sign}R${formatted}`;
};

const InvestTabPage = ({ onOpenNotifications, onOpenMarkets, onOpenOpenStrategies }) => {
  const { profile } = useProfile();
  const [activeCard, setActiveCard] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [activeTab, setActiveTab] = useState("1m");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const [dbData, setDbData] = useState({
    holdings: [],
    snapshots: [],
    strategiesCount: 0,
    totalMarketValue: 0,
    totalInvested: 0,
    strategyMarketValue: 0,
    strategyInvested: 0,
  });

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!userId || !supabase) return;
      setLoading(true);

      const { data: holdings } = await supabase
        .from("stock_holdings")
        .select("*, securities(name, symbol, logo_url)")
        .eq("user_id", userId);

      const { data: snapshots } = await supabase
        .from("mint_balance_snapshots")
        .select("snapshot_date, total_balance")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: true });

      const { count: sCount } = await supabase
        .from("strategies")
        .select("*", { count: "exact", head: true });

      if (holdings) {
        const mValue = holdings.reduce((acc, h) => acc + Number(h.market_value || 0), 0);
        const invested = holdings.reduce((acc, h) => acc + Number(h.avg_cost || 0) * Number(h.quantity || 0), 0);

        setDbData({
          holdings,
          snapshots: snapshots?.map((s) => ({ d: s.snapshot_date, v: Number(s.total_balance) })) || [],
          strategiesCount: sCount || 0,
          totalMarketValue: mValue,
          totalInvested: invested,
          strategyMarketValue: mValue * 0.3,
          strategyInvested: invested * 0.35,
        });
      }
      setLoading(false);
    };
    loadData();
  }, [userId]);

  const portfolioReturn = dbData.totalMarketValue - dbData.totalInvested;
  const strategyReturn = dbData.strategyMarketValue - dbData.strategyInvested;
  const portfolioIsLoss = portfolioReturn < 0;
  const strategyIsLoss = strategyReturn < 0;
  const chartColor = portfolioIsLoss ? "#FB7185" : "#10B981";
  const masked = "••••";

  const minSwipeDistance = 50;

  const onTouchStartHandler = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMoveHandler = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && activeCard < 1) setActiveCard(1);
    if (isRightSwipe && activeCard > 0) setActiveCard(0);
  };

  const renderMintCard = () => (
    <div
      className="relative w-full flex-shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2D1052] to-[#1A0B2E] text-white border border-white/10"
      style={{ aspectRatio: "1.7 / 1" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-purple-600/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-white/[0.02] blur-xl" />
      </div>
      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-[0.5px] rounded-[28px]" />
      <div className="relative z-10 flex flex-col justify-between h-full p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
              mint
            </span>
            <span className="ml-1 text-[10px] uppercase tracking-[0.3em] text-white/40 font-medium">invest</span>
          </div>
          <button onClick={() => setIsVisible(!isVisible)} className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            {isVisible ? <Eye size={16} className="text-white/70" /> : <EyeOff size={16} className="text-white/70" />}
          </button>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">total portfolio</p>
          <p className="text-3xl font-semibold tracking-tight">
            {isVisible ? formatKMB(dbData.totalMarketValue) : masked}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                portfolioIsLoss ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {isVisible ? `${portfolioIsLoss ? "" : "+"}${formatKMB(portfolioReturn)}` : masked}
            </span>
            <span className="text-[10px] text-white/30">all time</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-5 rounded bg-white/10 backdrop-blur-sm" />
            <div className="w-8 h-5 rounded bg-white/10 backdrop-blur-sm" />
            <div className="w-8 h-5 rounded bg-white/10 backdrop-blur-sm" />
            <div className="w-8 h-5 rounded bg-white/10 backdrop-blur-sm" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-violet-500/30" />
            <div className="w-6 h-6 rounded-full bg-purple-400/20 -ml-2" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPortfolioCard = () => (
    <div
      className="relative w-full flex-shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2D1052] to-[#1A0B2E] text-white border border-white/10"
      style={{ aspectRatio: "1.7 / 1" }}
    >
      <div className="relative z-10 flex h-full">
        <div className="w-[50%] p-5 flex flex-col justify-between border-r border-white/5">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-normal mb-1.5">portfolio value</p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg font-normal">{isVisible ? formatKMB(dbData.totalMarketValue) : masked}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-normal uppercase text-white/60">
                  {isVisible ? formatKMB(dbData.totalInvested) : masked}(invested)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-normal ${portfolioIsLoss ? "text-rose-400" : "text-emerald-400"}`}>
                  {isVisible ? formatKMB(portfolioReturn) : masked}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-normal uppercase ${
                    portfolioIsLoss ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {isVisible ? "return" : masked}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-normal mb-1.5">
                strategies ({dbData.strategiesCount})
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base font-normal">
                  {isVisible ? formatKMB(dbData.strategyMarketValue) : masked}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-normal uppercase text-white/60">
                  {isVisible ? formatKMB(dbData.strategyInvested) : masked}(invested)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-normal ${strategyIsLoss ? "text-rose-400" : "text-emerald-400"}`}>
                  {isVisible ? formatKMB(strategyReturn) : masked}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-normal uppercase ${
                    strategyIsLoss ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {isVisible ? "return" : masked}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-[50%] p-5 flex flex-col">
          <div className="flex justify-end mb-2">
            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
              {["1m", "3m", "6m"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 text-[9px] font-normal rounded-md ${
                    activeTab === tab ? "bg-white text-slate-900" : "text-white/40"
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dbData.snapshots}>
                <YAxis hide domain={["auto", "auto"]} />
                <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.1} />
                <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-violet-400" />
              <span className="text-[10px] font-normal text-white/70">All Investments</span>
            </div>
            {showDropdown ? (
              <ChevronUp size={14} className="opacity-40" />
            ) : (
              <ChevronDown size={14} className="opacity-40" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{displayName || "Investor"}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Invest</p>
              </div>
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out gap-4"
              style={{ transform: `translateX(calc(-${activeCard * 100}% - ${activeCard * 16}px))` }}
              onTouchStart={onTouchStartHandler}
              onTouchMove={onTouchMoveHandler}
              onTouchEnd={onTouchEndHandler}
            >
              <div className="w-full flex-shrink-0">{renderMintCard()}</div>
              <div className="w-full flex-shrink-0">{renderPortfolioCard()}</div>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCard(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeCard === idx ? "w-6 bg-white" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onOpenMarkets}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <TrendingUp size={16} />
              Markets
            </button>
            <button
              onClick={onOpenOpenStrategies}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <LayoutGrid size={16} />
              Strategies
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-2 flex w-full max-w-sm flex-col gap-4 px-4 py-6 md:max-w-md md:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">All Investments</h2>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">
            {dbData.holdings.length} holdings
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                    <div className="h-2 w-16 bg-slate-50 rounded" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
                    <div className="h-2 w-12 bg-slate-50 rounded ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : dbData.holdings.length === 0 ? (
          <div className="rounded-3xl bg-white px-4 py-8 shadow-md text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-violet-50 text-violet-600 mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <p className="text-base font-semibold text-slate-900 mb-1">No investments yet</p>
            <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
              Start building your portfolio by exploring the markets.
            </p>
            <button
              onClick={onOpenMarkets}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Explore Markets
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {dbData.holdings.map((item, idx) => {
              const pnlPercent =
                item.avg_cost && item.quantity
                  ? ((item.unrealized_pnl || 0) / (item.avg_cost * item.quantity)) * 100
                  : 0;
              const isLoss = pnlPercent < 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                      {item.securities?.logo_url ? (
                        <img src={item.securities.logo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold text-slate-400">
                          {item.securities?.symbol?.substring(0, 2)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.securities?.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{item.securities?.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{formatKMB(item.market_value)}</p>
                    <p className={`text-[10px] font-medium ${isLoss ? "text-rose-500" : "text-emerald-500"}`}>
                      {isLoss ? "" : "+"}
                      {pnlPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestTabPage;
