import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Zap, 
  Info, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileSignature, 
  HandCoins, 
  History,
  X,
  Check
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

// Filter Options Constants
const sortOptions = ["Recommended", "Best performance", "Lowest minimum"];
const riskOptions = ["Low risk", "Balanced", "Growth", "High risk"];
const exposureOptions = ["Local", "Global", "Mixed"];

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState(null);
  
  // Tab State inside the Filter Sheet
  const [filterTab, setFilterTab] = useState("assets"); // 'assets' | 'strategies'

  // Assets Filter States
  const [activeAssetFilter, setActiveAssetFilter] = useState("all");
  const [draftAssetFilter, setDraftAssetFilter] = useState("all");

  // Strategy Filter States (From OpenStrategiesPage.jsx)
  const [selectedRisks, setSelectedRisks] = useState(new Set());
  const [draftRisks, setDraftRisks] = useState(new Set());
  const [selectedSort, setSelectedSort] = useState("Recommended");
  const [draftSort, setDraftSort] = useState("Recommended");

  // Sheet UI State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const portfolioItems = [
    { id: 1, name: "Bitcoin Alpha", balance: 4250.34, available: 5749.66, ltv: "50%", type: "strategy", code: "BTC-005", logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
    { id: 2, name: "Global Equity", balance: 12890.12, available: 8200.00, ltv: "40%", type: "strategy", code: "GEQ-012", logo: null },
    { id: 3, name: "Nvidia Corp", balance: 15420.50, available: 7710.25, ltv: "50%", type: "stock", code: "NVDA", logo: "https://logo.clearbit.com/nvidia.com" },
    { id: 4, name: "Apple Inc", balance: 9800.00, available: 4900.00, ltv: "50%", type: "stock", code: "AAPL", logo: "https://logo.clearbit.com/apple.com" },
  ];

  const filteredItems = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeAssetFilter === "all" || item.type === activeAssetFilter;
      // Add more complex logic here if strategy filters should affect this list
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeAssetFilter]);

  const sparklineData = [{ v: 40 }, { v: 35 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 50 }, { v: 75 }];

  // --- Sheet Interaction Handlers ---
  const resetSheetPosition = () => {
    setSheetOffset(0);
    dragStartY.current = null;
    isDragging.current = false;
  };

  const handleSheetPointerDown = (e) => {
    dragStartY.current = e.clientY;
    isDragging.current = true;
  };

  const handleSheetPointerMove = (e) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    setSheetOffset(delta > 0 ? delta : 0);
  };

  const handleSheetPointerUp = () => {
    if (!isDragging.current) return;
    if (sheetOffset > 100) setIsFilterOpen(false);
    resetSheetPosition();
  };

  const applyAllFilters = () => {
    setActiveAssetFilter(draftAssetFilter);
    setSelectedRisks(new Set(draftRisks));
    setSelectedSort(draftSort);
    setIsFilterOpen(false);
    resetSheetPosition();
  };

  const clearAllFilters = () => {
    setDraftAssetFilter("all");
    setDraftRisks(new Set());
    setDraftSort("Recommended");
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(p => p[0]).join("").toUpperCase() || "MN";

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900 bg-[#f8f6fa]">
      {/* Background Decor */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[60vh] bg-gradient-to-b from-slate-900 to-[#f8f6fa]" />

      <div className="px-5 pt-12 pb-8">
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-xs font-bold backdrop-blur-md">
            {initials}
          </div>

          <NavigationPill 
            activeTab="credit" 
            onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} 
          />

          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Liquidity Card */}
        <div className="bg-white/70 backdrop-blur-3xl rounded-[40px] p-6 shadow-2xl shadow-slate-200/50 border border-white mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div className="max-w-[210px]">
              <p className="text-slate-500 text-[13px] leading-relaxed font-medium">
                Pledge qualifying strategies and assets to unlock <span className="text-slate-900 font-bold">instant liquidity</span>.
              </p>
            </div>
            <div className="text-5xl font-black text-slate-900/5 tracking-tighter" style={{ fontFamily: fonts.display }}>
              {portfolioItems.length}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[32px] p-7 shadow-2xl relative min-h-[180px] flex flex-col justify-between overflow-hidden">
             {/* Decorative radial glow */}
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-violet-500/20 blur-[80px]" />
            
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Liquidity Available</p>
                   <Info size={12} className="text-white/20" />
                </div>
                <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: fonts.display }}>
                  <span className="text-4xl font-light">R14,567</span>
                  <span className="text-2xl font-medium opacity-40">.89</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                <Zap size={22} className="text-violet-400 fill-violet-400/20" />
              </div>
            </div>

            <button className="w-full bg-white text-slate-900 text-[11px] uppercase tracking-[0.2em] font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] mt-6 hover:bg-slate-50">
              Pledge All Assets
            </button>
          </div>
        </div>

        {/* Overhauled Production-Ready Action Grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 px-1">
          {[
            { label: "Apply", icon: Plus, color: "bg-emerald-50 text-emerald-600" },
            { label: "Active", icon: FileSignature, color: "bg-blue-50 text-blue-600" },
            { label: "Pay", icon: HandCoins, color: "bg-violet-50 text-violet-600" },
            { label: "History", icon: History, color: "bg-slate-100 text-slate-600" }
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2.5 transition active:scale-95 group">
              <div className={`h-[68px] w-full rounded-[24px] ${action.color} border border-white shadow-sm flex items-center justify-center transition-all group-hover:shadow-md`}>
                <action.icon size={24} strokeWidth={2} />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search portfolio..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/60 rounded-[20px] py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="h-14 w-14 rounded-[20px] bg-slate-900 text-white flex items-center justify-center shadow-lg transition active:scale-90 hover:bg-slate-800"
          >
            <SlidersHorizontal size={22} />
          </button>
        </div>

        {/* Asset List Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 mb-2">
             <h3 className="text-[15px] font-bold text-slate-900">Qualifying Assets</h3>
             <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{filteredItems.length} Total</span>
          </div>
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 transition active:scale-[0.98] hover:shadow-md">
              <div className="flex justify-between items-center mb-5">
                 <div className="flex items-center gap-4">
                   <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                     {item.logo ? <img src={item.logo} alt={item.name} className="h-9 w-9 object-contain" /> : <div className="text-[11px] font-black text-slate-300">{item.code.slice(0,2)}</div>}
                   </div>
                   <div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                     <div className="flex items-baseline tracking-tight" style={{ fontFamily: fonts.display }}>
                        <span className="text-2xl font-bold text-slate-900">R{Math.floor(item.balance).toLocaleString()}</span>
                        <span className="text-lg font-bold text-slate-300">.{(item.balance % 1).toFixed(2).split('.')[1]}</span>
                     </div>
                   </div>
                 </div>
                 <div className="h-12 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                 <p className="text-[13px] font-bold text-slate-600">{formatZar(item.available)} <span className="text-slate-300 font-medium">Available</span></p>
                 <div className="text-right">
                    <p className="text-[11px] font-black text-slate-900 uppercase">LTV {item.ltv}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{item.code}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REFACTORED: Dual-Tab Filter Sheet */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 h-full w-full"
            onClick={() => { setIsFilterOpen(false); resetSheetPosition(); }}
          />
          
          <motion.div
            initial={{ y: "100%" }} animate={{ y: sheetOffset }}
            className="relative z-10 flex h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center pt-4 pb-2">
              <div className="h-1.5 w-14 rounded-full bg-slate-200" />
            </div>

            {/* Sticky Header with Integrated Switcher */}
            <div className="sticky top-0 z-10 bg-white px-6 pb-6 pt-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>Filters</h3>
                <button onClick={clearAllFilters} className="text-sm font-bold text-violet-600">Reset</button>
              </div>
              
              {/* Tab Switcher Pills */}
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button 
                  onClick={() => setFilterTab("assets")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${filterTab === "assets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Assets
                </button>
                <button 
                  onClick={() => setFilterTab("strategies")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${filterTab === "strategies" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Strategies
                </button>
              </div>
            </div>

            {/* Dynamic Filter Content */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="space-y-8 pb-10">
                
                {filterTab === "assets" ? (
                  /* ASSET FILTERS */
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Category</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {["all", "strategy", "stock"].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setDraftAssetFilter(opt)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${draftAssetFilter === opt ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm" : "border-slate-100 bg-slate-50 text-slate-600"}`}
                          >
                            <span className="text-sm font-bold capitalize">{opt === 'all' ? 'All Portfolio' : opt + 's'}</span>
                            {draftAssetFilter === opt && <Check size={18} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STRATEGY FILTERS (From OpenStrategiesPage) */
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Sort By</h4>
                      <div className="flex flex-wrap gap-2">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setDraftSort(opt)}
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${draftSort === opt ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500"}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Risk Tolerance</h4>
                      <div className="flex flex-wrap gap-2">
                        {riskOptions.map((opt) => {
                          const isSel = draftRisks.has(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                const next = new Set(draftRisks);
                                isSel ? next.delete(opt) : next.add(opt);
                                setDraftRisks(next);
                              }}
                              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${isSel ? "bg-violet-600 border-violet-600 text-white" : "border-slate-200 text-slate-500"}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Market Exposure</h4>
                      <div className="flex flex-wrap gap-2">
                        {exposureOptions.map((opt) => (
                          <button key={opt} className="px-4 py-2 rounded-full text-xs font-bold border border-slate-200 text-slate-500 opacity-50 cursor-not-allowed">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Apply Button */}
            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 pb-10 pt-4">
              <button
                onClick={applyAllFilters}
                className="w-full rounded-[24px] bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] py-4 text-sm font-bold text-white shadow-xl shadow-violet-200/50 transition active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;