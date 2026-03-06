import React from "react";
import { Search, SlidersHorizontal, Zap, Bell } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";

const InstantLiquidity = ({ profile, onOpenNotifications }) => {
  const firstName = profile?.firstName || "Mufaro"; // Integrated from your profile

  return (
    <div className="min-h-screen bg-[#f8f6fa] pb-32 relative overflow-x-hidden">
      {/* Dynamic Gradient */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[45vh] bg-gradient-to-b from-[#5b21b6] via-[#7c3aed] to-[#f8f6fa]" />

      <div className="px-6 pt-12 pb-8">
        <header className="flex items-center justify-between mb-8 text-white">
          <div className="h-10 w-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs">
            {profile?.initials || "MN"}
          </div>
          <button onClick={onOpenNotifications} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Bell size={20} />
          </button>
        </header>

        {/* Greeting & Watermark */}
        <div className="relative mb-8">
           <span className="absolute -top-12 -right-4 text-[140px] font-black text-white/10 pointer-events-none select-none">9</span>
           <div className="text-white relative z-10">
             <h2 className="text-xl font-medium opacity-90">Good Morning {firstName}.</h2>
             <p className="text-[11px] leading-tight opacity-70 mt-1 max-w-[210px]">
               The more <span className="font-bold">qualifying strategies</span> the more access you have to instant liquidity.
             </p>
           </div>
        </div>

        {/* Hero Card */}
        <section className="bg-white/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/50 mb-6">
          <div className="flex justify-between items-start mb-2">
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Available Liquidity</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{formatZar(14567.89)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prime Interest</p>
              <p className="text-lg font-bold text-slate-900">10,5%</p>
            </div>
          </div>
          <button className="mt-6 w-full py-4 bg-[#31005e] text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">
            Pledge All
          </button>
        </section>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {["Apply", "Active Loans", "Pay", "Pledge History"].map((label, i) => (
            <button key={label} className={`h-20 rounded-2xl flex items-center justify-center p-2 text-center text-[10px] font-bold leading-tight shadow-sm border ${
              i === 0 ? "bg-white border-purple-300 ring-4 ring-purple-50 text-slate-900" : "bg-slate-100/50 border-transparent text-slate-400"
            }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Strategy List Example */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                 <Zap size={20} className="text-orange-500 fill-orange-500" />
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-400">Bitcoin Alpha</p>
                 <p className="text-2xl font-black text-slate-900">{formatZar(4250.34)}</p>
               </div>
             </div>
             {/* Mini Sparkline */}
             <div className="h-10 w-20 flex items-end">
                <div className="w-full h-4 bg-emerald-500/20 border-b-2 border-emerald-500 rounded-sm" />
             </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
             <p className="text-xs font-bold text-slate-400">{formatZar(5749.66)} <span className="opacity-50">Available</span></p>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-900 uppercase">LTV 50%</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BTC-005</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantLiquidity;