import React, { useState, useEffect } from "react";
import { ChevronLeft, Landmark, TrendingDown } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const RepayLiquidity = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  useEffect(() => {
    if (profile?.id) {
      async function fetchLoans() {
        setLoading(true);
        const { data } = await supabase
          .from('loan_application')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'approved');
        if (data) setActiveLoans(data);
        setLoading(false);
      }
      fetchLoans();
    }
  }, [profile?.id]);

  return (
    <div className="min-h-screen pb-32 bg-[#f8f6fa]">
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
          <h2 className="text-xl font-bold" style={{ fontFamily: fonts.display }}>Repay Capital</h2>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking Debt Records...</div>
        ) : activeLoans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
            <p className="text-slate-400 font-medium">No outstanding repayments found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLoans.map(loan => (
              <div key={loan.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-inner"><Landmark size={24} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Ref</p>
                      <p className="font-bold text-slate-900">{loan.id.split('-')[0].toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement</p>
                    <p className="text-lg font-black" style={{ fontFamily: fonts.display }}>{formatZar(loan.principal_amount)}</p>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-emerald-50 rounded-2xl flex items-center gap-3 border border-emerald-100/50">
                  <TrendingDown size={16} className="text-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Interest savings calculated at settlement.</p>
                </div>

                <button className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  Initiate Repayment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepayLiquidity;