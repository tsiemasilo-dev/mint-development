import React, { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, TrendingUp, LayoutGrid, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "../lib/supabase"; // Existing team client

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

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

const SwipeableBalanceCard = ({ userId }) => {
  const [activeTab, setActiveTab] = useState("1m");
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [dbData, setDbData] = useState({
    holdings: [],
    snapshots: [],
    strategiesCount: 0,
    totalMarketValue: 0, 
    totalInvested: 0,
    strategyMarketValue: 0,
    strategyInvested: 0
  });

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(VISIBILITY_STORAGE_KEY) !== "false";
    }
    return true;
  });

  // Isolated Fetch Logic: Only affects this component
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      
      // Fetching specifically from your defined tables
      const { data: holdings } = await supabase
        .from('stock_holdings')
        .select('*, securities(name, symbol, logo_url)')
        .eq('user_id', userId);

      const { data: snapshots } = await supabase
        .from('mint_balance_snapshots')
        .select('snapshot_date, total_balance')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: true });

      const { count: sCount } = await supabase
        .from('strategies')
        .select('*', { count: 'exact', head: true });

      if (holdings) {
        const mValue = holdings.reduce((acc, h) => acc + Number(h.market_value || 0), 0);
        const invested = holdings.reduce((acc, h) => acc + (Number(h.avg_cost || 0) * Number(h.quantity || 0)), 0);

        setDbData({
          holdings,
          snapshots: snapshots?.map(s => ({ d: s.snapshot_date, v: Number(s.total_balance) })) || [],
          strategiesCount: sCount || 0,
          totalMarketValue: mValue,
          totalInvested: invested,
          strategyMarketValue: mValue * 0.3, 
          strategyInvested: invested * 0.35
        });
      }
      setLoading(false);
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!userId) return;

      const { data, error } = await supabase.rpc('get_isolated_portfolio_history', {
        p_user_id: userId,
        p_security_id: selectedAsset?.security_id || null 
      });

      if (!error && data) {
        setDbData(prev => ({
          ...prev,
          snapshots: data.map(point => ({ d: point.d, v: Number(point.v) }))
        }));
      }
    };

    fetchChartData();
  }, [userId, selectedAsset]);

  const portfolioReturn = dbData.totalMarketValue - dbData.totalInvested;
  const strategyReturn = dbData.strategyMarketValue - dbData.strategyInvested;
  const portfolioIsLoss = portfolioReturn < 0;
  const strategyIsLoss = strategyReturn < 0;
  const chartColor = portfolioIsLoss ? "#FB7185" : "#10B981"; 

  const itemsPerPage = 8;
  const totalPages = Math.ceil(dbData.holdings.length / itemsPerPage);
  const paginatedItems = dbData.holdings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const masked = "••••";

  if (loading && userId) return <div className="w-full aspect-[1.7/1] animate-pulse bg-white/5 rounded-[28px]" />;

  return (
    <div className="relative w-full z-[100]">
      <div className="relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2D1052] to-[#1A0B2E] text-white border border-white/10" style={{ aspectRatio: "1.7 / 1" }}>
        <div className="relative z-10 flex h-full">
          {/* Metrics Stack */}
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
                  <span className={`text-base font-normal ${portfolioIsLoss ? 'text-rose-400' : 'text-emerald-400'}`}>{isVisible ? formatKMB(portfolioReturn) : masked}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-normal uppercase ${portfolioIsLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isVisible ? "return" : masked}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-normal mb-1.5">strategies ({dbData.strategiesCount})</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base font-normal">{isVisible ? formatKMB(dbData.strategyMarketValue) : masked}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-normal uppercase text-white/60">
                    {isVisible ? formatKMB(dbData.strategyInvested) : masked}(invested)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-normal ${strategyIsLoss ? 'text-rose-400' : 'text-emerald-400'}`}>{isVisible ? formatKMB(strategyReturn) : masked}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-normal uppercase ${strategyIsLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isVisible ? "return" : masked}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart & Selector */}
          <div className="w-[50%] p-5 flex flex-col">
            <div className="flex justify-end mb-2">
              <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                {["1m", "3m", "6m"].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 py-0.5 text-[9px] font-normal rounded-md ${activeTab === tab ? "bg-white text-slate-900" : "text-white/40"}`}>{tab.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dbData.snapshots}>
                  <YAxis hide domain={['auto', 'auto']} /> 
                  <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.1} />
                  <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <button onClick={() => setIsOpen(!isOpen)} className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                <LayoutGrid size={12} className="text-violet-400" />
                <span className="text-[10px] font-normal text-white/70">{selectedAsset ? selectedAsset.securities?.symbol : "All Investments"}</span>
              </div>
              {isOpen ? <ChevronUp size={14} className="opacity-40" /> : <ChevronDown size={14} className="opacity-40" />}
            </button>
          </div>
        </div>
      </div>

      {/* Light Mode Dropdown */}
      {isOpen && (
        <div className="absolute top-[102%] left-0 w-full bg-white border border-slate-200 rounded-[24px] shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-3 space-y-1 max-h-[320px] overflow-y-auto">
            <button onClick={() => { setSelectedAsset(null); setIsOpen(false); }} className="w-full flex items-center p-3 rounded-2xl hover:bg-slate-50 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><LayoutGrid size={14} className="text-slate-400" /></div>
                <p className="text-[11px] font-normal text-slate-900">All Investments</p>
              </div>
            </button>
            {paginatedItems.map((item, idx) => (
              <button key={idx} onClick={() => { setSelectedAsset(item); setIsOpen(false); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-100 bg-slate-50">
                    {item.securities?.logo_url ? <img src={item.securities.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">{item.securities?.symbol?.substring(0, 2)}</div>}
                  </div>
                  <div>
                    <p className="text-[11px] font-normal text-slate-900">{item.securities?.name}</p>
                    <p className="text-[9px] text-slate-400 font-normal uppercase">{item.securities?.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-normal text-slate-900">{formatKMB(item.market_value)}</p>
                  <p className={`text-[9px] font-normal ${item.unrealized_pnl < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {((item.unrealized_pnl / (item.avg_cost * item.quantity)) * 100).toFixed(1)}%
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableBalanceCard;