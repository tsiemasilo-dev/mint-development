import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ShieldCheck, ChevronRight, X, Zap, AlertCircle } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const ActiveLiquidity = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  useEffect(() => { setPortalTarget(document.body); }, []);

  useEffect(() => {
    async function fetchActiveLoans() {
      if (!profile?.id) return;
      setLoading(true);
      // Fetches approved loans and joins with security metadata for live risk tracking
      const { data, error } = await supabase
        .from('loan_application')
        .select(`
          *,
          pbc_collateral_pledges (
            symbol, pledged_value, recognised_value,
            securities ( logo_url, margin_call_pct, auto_liq_pct )
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'approved');

      if (!error) setActiveLoans(data);
      setLoading(false);
    }
    fetchActiveLoans();
  }, [profile?.id]);

  return (
    <div className="min-h-screen pb-32 bg-[#f8f6fa] text-slate-900">
      {/* Standardized Dark Header */}
      <header className="px-5 pt-12 pb-8 flex items-center justify-between bg-[#0d0d12] text-white">
        <div className="flex items-center gap-2">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70" style={{ fontFamily: fonts.display }}>credit</span>
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        <NotificationBell onClick={onOpenNotifications} />
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={onBack}>
          <ChevronLeft className="text-slate-400" />
          <h2 className="text-xl font-bold" style={{ fontFamily: fonts.display }}>Active Pledges</h2>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">Retrieving Vault Data...</div>
        ) : activeLoans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-medium">No active credit positions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLoans.map((loan) => (
              <button
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
                className="w-full bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm text-left flex justify-between items-center active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal Debt</p>
                    <p className="text-lg font-bold" style={{ fontFamily: fonts.display }}>{formatZar(loan.principal_amount)}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* POSITION HEALTH MODAL */}
      {selectedLoan && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100">
            <button onClick={() => setSelectedLoan(null)} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center"><X size={20} /></button>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Health</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-10 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Outstanding</p>
              <p className="text-4xl font-bold tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(selectedLoan.principal_amount)}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 shadow-inner">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidation Safety Bar</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Secure</span>
                </div>
                <div className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${(selectedLoan.pbc_collateral_pledges[0]?.securities?.margin_call_pct || 0.65) * 100}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${((selectedLoan.pbc_collateral_pledges[0]?.securities?.auto_liq_pct || 0.70) - (selectedLoan.pbc_collateral_pledges[0]?.securities?.margin_call_pct || 0.65)) * 100}%` }} />
                  <div className="h-full bg-rose-500 flex-1" />
                  {/* Live LTV Needle */}
                  <div className="absolute top-0 bottom-0 w-1 bg-white shadow-xl ring-2 ring-black/5" style={{ left: `${(selectedLoan.principal_amount / selectedLoan.pbc_collateral_pledges[0]?.pledged_value) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        , portalTarget)}
    </div>
  );
};

export default ActiveLiquidity;