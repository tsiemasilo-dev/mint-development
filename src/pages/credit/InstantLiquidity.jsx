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
  Check,
  ChevronLeft,
  X,
  Lock,
  ArrowRight,
  ShieldCheck,
  Signature
} from "lucide-react";
import { 
  Line, 
  ComposedChart, 
  ResponsiveContainer, 
  YAxis, 
  Area, 
  XAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  // --- Workflow States ---
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const [workflowStep, setWorkflowStep] = useState("idle"); // idle, agreement, auth, success
  const [isProcessing, setIsProcessing] = useState(false);

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

  const totalAvailable = portfolioItems.reduce((acc, item) => acc + item.available, 0);

  const filteredItems = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  // Pro Chart Data - Simulating the 100-index base from your MarketsPage
  const chartData = useMemo(() => [
    { date: '01 Mar', v: 100 }, { date: '02 Mar', v: 102 }, { date: '03 Mar', v: 101 },
    { date: '04 Mar', v: 105 }, { date: '05 Mar', v: 104 }, { date: '06 Mar', v: 108 },
    { date: '07 Mar', v: 112 }
  ], []);

  // Workflow Handlers
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setPledgeAmount("");
    setRepaymentDate("");
    setUserInitials("");
    setIsDetailOpen(true);
    setWorkflowStep("idle");
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => {
      setSelectedItem(null);
      setWorkflowStep("idle");
    }, 300);
  };

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(p => p[0]).join("").toUpperCase() || "MN";

  const principal = parseFloat(pledgeAmount) || 0;
  const totalRepayment = principal * 1.105 + 62; // Interest + Custody Fee logic

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900" style={{ fontFamily: fonts.text }}>
      
      {/* Background - Main Page */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[#f8f6fa]" />

      <div className="px-5 pt-12 pb-8 max-w-lg mx-auto">
        <header className="relative flex items-center justify-between mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-xs font-semibold">{initials}</div>
          <NavigationPill activeTab="credit" onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Main Liquidity Card */}
        <div className="bg-white rounded-[40px] p-6 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8 overflow-hidden">
          <div className="flex justify-between items-start mb-10">
            <div className="max-w-[220px]">
              <p className="text-slate-500 text-[13px] leading-relaxed font-medium">
                Pledge your assets to unlock <span className="text-slate-900 font-bold underline decoration-violet-300 underline-offset-4">instant liquidity</span>.
              </p>
            </div>
            <Zap className="text-slate-100" size={48} strokeWidth={3} />
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Liquidity Available</p>
                <div className="flex items-baseline text-white tracking-tighter" style={{ fontFamily: fonts.display }}>
                  <span className="text-4xl font-light">R{Math.floor(totalAvailable).toLocaleString()}</span>
                  <span className="text-2xl font-medium opacity-40">.{(totalAvailable % 1).toFixed(2).split('.')[1]}</span>
                </div>
            </div>
            <button 
                onClick={() => handleOpenDetail('all')}
                className="w-full bg-white text-slate-900 text-[11px] uppercase tracking-[0.15em] font-black py-4.5 rounded-2xl shadow-xl transition-all active:scale-[0.98] mt-8 flex items-center justify-center gap-2"
            >
              Pledge All Assets <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search portfolio..." 
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-sm focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Asset List */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div 
                key={item.id} onClick={() => handleOpenDetail(item)}
                className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-50 transition-all active:scale-[0.98] flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center p-3">
                        {item.logo ? <img src={item.logo} alt={item.name} className="h-full w-full object-contain" /> : <div className="text-[10px] font-black text-slate-300 uppercase">{item.code.slice(0,2)}</div>}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.name}</p>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{formatZar(item.available)}</p>
                    </div>
                </div>
                <ChevronLeft className="rotate-180 text-slate-200" size={20} />
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL MODAL (Z-INDEX 999) */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[999] bg-white flex flex-col animate-slide-up shadow-2xl">
            <div className="px-6 pt-14 pb-4 flex items-center justify-between">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-transform">
                    <ChevronLeft size={20} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pledge Position</span>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto px-8 pt-6">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2" style={{ fontFamily: fonts.display }}>
                        {selectedItem === 'all' ? "Multi-Asset Pledge" : selectedItem?.name}
                    </h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        Qualifying Asset <Check size={10} />
                    </div>
                </div>

                {/* Professional Composed Chart */}
                <div className="h-56 w-full -mx-4 mb-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <Tooltip 
                                cursor={{ stroke: '#8b5cf6', strokeWidth: 1 }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="v" stroke="none" fill="url(#chartGradient)" />
                            <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-10 max-w-sm mx-auto pb-10">
                    <div className="text-center">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Maximum Liquidity</p>
                        <p className="text-5xl font-light tracking-tighter text-slate-900" style={{ fontFamily: fonts.display }}>
                           {formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0)}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Amount</label>
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-slate-400 text-lg">R</span>
                                <input 
                                    type="number" value={pledgeAmount} 
                                    onChange={(e) => setPledgeAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent font-bold text-2xl text-slate-900 outline-none" 
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repayment Date</label>
                            <input 
                                type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)}
                                className="w-full bg-transparent font-bold text-slate-900 outline-none cursor-pointer" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                <button 
                    disabled={!pledgeAmount || !repaymentDate}
                    onClick={() => setWorkflowStep("agreement")}
                    className="w-full h-16 rounded-[22px] bg-slate-900 text-white font-bold shadow-2xl transition-all active:scale-[0.97] disabled:opacity-20"
                >
                    Review Pledge
                </button>
            </div>
        </div>
      , portalTarget)}

      {/* AGREEMENT & SIGNATURE OVERLAY (Z-INDEX 1000) */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl px-6">
            
            {/* STEP 1: AGREEMENT (APPLE DOC STYLE) */}
            {workflowStep === "agreement" && (
                <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl animate-modal-pop">
                    <div className="flex h-14 w-14 bg-violet-50 rounded-2xl items-center justify-center mb-8 text-violet-600">
                        <FileSignature size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: fonts.display }}>Pledge Agreement</h3>
                    
                    <div className="space-y-4 mb-10 text-sm">
                         <div className="flex justify-between pb-3 border-b border-slate-100">
                            <span className="text-slate-400 font-medium">Principal</span>
                            <span className="font-bold text-slate-900">{formatZar(principal)}</span>
                         </div>
                         <div className="flex justify-between pb-3 border-b border-slate-100">
                            <span className="text-slate-400 font-medium">Interest (10.5%)</span>
                            <span className="font-bold text-slate-900">{formatZar(principal * 0.105)}</span>
                         </div>
                         <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Due</span>
                            <span className="text-xl font-bold text-violet-600 tracking-tight">{formatZar(totalRepayment)}</span>
                         </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Enter Initials to Sign</label>
                        <input 
                            type="text" 
                            maxLength={3} 
                            placeholder="M N"
                            value={userInitials}
                            onChange={(e) => setUserInitials(e.target.value.toUpperCase())}
                            className="w-full bg-transparent text-2xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-violet-500 outline-none transition-all placeholder:text-slate-200"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            disabled={userInitials.length < 2}
                            onClick={() => setWorkflowStep("auth")} 
                            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all disabled:opacity-20"
                        >
                            Sign & Continue
                        </button>
                        <button onClick={() => setWorkflowStep("idle")} className="w-full py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
                    </div>
                </div>
            )}

            {/* STEP 2: AUTH */}
            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-modal-pop">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Lock size={24} className="text-slate-900" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Secure Confirm</h3>
                    <p className="text-sm text-slate-400 mb-10">Enter your 4-digit PIN</p>
                    <div className="flex justify-center gap-4 mb-12">
                        {[1,2,3,4].map(i => <div key={i} className="h-3 w-3 rounded-full bg-slate-200" />)}
                    </div>
                    <button 
                        onClick={() => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); setWorkflowStep("success"); }, 1500); }}
                        className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center"
                    >
                        {isProcessing ? <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Verify PIN"}
                    </button>
                </div>
            )}

            {/* STEP 3: SUCCESS */}
            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-modal-pop">
                    <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <ShieldCheck size={48} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Pledge Complete</h3>
                    <p className="text-sm text-slate-400 mb-10">Funds will be available in your account shortly.</p>
                    <div className="bg-slate-50 rounded-[32px] p-8 mb-10">
                        <p className="text-[10px] font-black text-slate-300 uppercase mb-2">Unlocked Liquidity</p>
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tighter">{formatZar(principal)}</h2>
                    </div>
                    <button onClick={closeDetail} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold shadow-xl">Return Home</button>
                </div>
            )}

        </div>
      , portalTarget)}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        @keyframes modal-pop {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      ` }} />
    </div>
  );
};

export default InstantLiquidity;