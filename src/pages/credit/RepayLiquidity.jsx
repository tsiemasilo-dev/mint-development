import React, { useState, useMemo, useEffect } from "react";
import { 
  Check, 
  ChevronLeft, 
  Landmark, 
  Calendar,
  TrendingDown,
  Clock
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

/**
 * RepayLiquidity Component
 * Handles early settlement of debt to release collateral and improve LTV buffer[cite: 93, 96].
 */
const RepayLiquidity = ({ onBack, fonts, profile }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- LIVE DATA FETCHING (Supabase) ---
  useEffect(() => {
    async function fetchLoans() {
      if (!profile?.id) return;
      setLoading(true);

      // Fetch active loans and join with pledges to show asset names [cite: 1]
      const { data, error } = await supabase
        .from('loan_application')
        .select(`
          id,
          principal_amount,
          amount_repayable,
          interest_rate,
          first_repayment_date,
          status,
          pbc_collateral_pledges (
            symbol
          )
        `)
        .eq('user_id', profile.id)
        .in('status', ['approved', 'active', 'partially_paid'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(loan => ({
          id: `LN-${loan.id.toString().slice(-4)}`,
          dbId: loan.id,
          asset: loan.pbc_collateral_pledges?.[0]?.symbol || "Portfolio Pool",
          code: loan.pbc_collateral_pledges?.[0]?.symbol || "AGG",
          principal: loan.principal_amount,
          interestAccrued: loan.amount_repayable - loan.principal_amount,
          nextPayment: loan.first_repayment_date,
          // Calculate monthly savings based on prime rate [cite: 13, 52]
          projectedMonthlyInterest: (loan.amount_repayable * (loan.interest_rate / 100)) / 12
        }));
        setActiveLoans(formatted);
      }
      setLoading(false);
    }
    fetchLoans();
  }, [profile?.id]);

  const totalOutstanding = useMemo(() => 
    activeLoans.reduce((sum, loan) => sum + loan.principal + loan.interestAccrued, 0), 
  [activeLoans]);

  // Handler for selecting a specific loan to pay early
  const handleSelectLoan = (loan) => {
    if (selectedLoanId === loan.id) {
        setSelectedLoanId(null);
        setRepayAmount("");
    } else {
        setSelectedLoanId(loan.id);
        const settlementValue = (loan.principal + loan.interestAccrued).toFixed(2);
        setRepayAmount(settlementValue);
    }
  };

  // --- SETTLEMENT TRANSACTION ---
  const handleConfirm = async () => {
    if (!repayAmount || isProcessing) return;
    setIsProcessing(true);

    try {
      const amount = parseFloat(repayAmount);

      // 1. Update Credit Account (Reduce Debt Balance)
      const { data: account } = await supabase
        .from('credit_accounts')
        .select('loan_balance')
        .eq('user_id', profile.id)
        .single();

      await supabase.from('credit_accounts').update({
        loan_balance: Math.max(0, (account?.loan_balance || 0) - amount),
        updated_at: new Date().toISOString()
      }).eq('user_id', profile.id);

      // 2. Update specific loan if selected
      if (selectedLoanId) {
        const loan = activeLoans.find(l => l.id === selectedLoanId);
        const remaining = (loan.principal + loan.interestAccrued) - amount;

        await supabase.from('loan_application').update({
          amount_repayable: Math.max(0, remaining),
          status: remaining <= 0 ? 'completed' : 'partially_paid'
        }).eq('id', loan.dbId);
      }

      setIsSuccess(true);
    } catch (err) {
      alert("Payment failed. Please check your bank connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="h-24 w-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 shadow-inner">
              <Check size={48} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: fonts?.display }}>Early Settlement Received</h2>
          <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed">
              Your payment of <span className="font-bold text-slate-900">{formatZar(parseFloat(repayAmount))}</span> has been successfully processed. {selectedLoanId ? "Your collateral position has been adjusted accordingly." : "Your global debt balance has been updated."}
          </p>
          <button 
              onClick={onBack} 
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
          >
              Return to Dashboard
          </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Settle Debt</h3>
            <p className="text-[10px] font-bold text-violet-600">Early Repayment</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        
        {/* Total Outstanding Header */}
        <div className="px-6 pt-8 pb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Debt Outstanding</p>
            {loading ? (
                <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
            ) : (
                <h2 className="text-4xl font-light text-slate-900 tracking-tight" style={{ fontFamily: fonts?.display }}>
                    {formatZar(totalOutstanding)}
                </h2>
            )}
        </div>

        {/* Repayment Amount Input */}
        <div className="px-6 mb-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repayment Amount</span>
                    <button 
                        onClick={() => { 
                            const max = selectedLoanId 
                                ? activeLoans.find(l => l.id === selectedLoanId).principal + activeLoans.find(l => l.id === selectedLoanId).interestAccrued 
                                : totalOutstanding;
                            setRepayAmount(max.toFixed(2)); 
                        }} 
                        className="text-[10px] font-bold text-violet-600 uppercase tracking-wider bg-violet-50 px-3 py-1 rounded-full active:scale-95 transition-all"
                    >
                        Max
                    </button>
                </div>
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                    <span className="text-2xl font-bold text-slate-300">R</span>
                    <input 
                        type="number" 
                        value={repayAmount} 
                        onChange={(e) => setRepayAmount(e.target.value)} 
                        placeholder="0.00" 
                        className="w-full text-4xl font-bold text-slate-900 outline-none placeholder:text-slate-200 tracking-tight bg-transparent" 
                    />
                </div>
            </div>
        </div>

        {/* Funds Source Selection */}
        <div className="px-6 mb-8 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Source of Funds</p>
            {[
                { id: 'bank', label: 'Linked Bank Account', sub: 'Standard Bank ••• 429', icon: Landmark }
            ].map(m => (
                <button 
                    key={m.id} 
                    onClick={() => setMethod(m.id)} 
                    className={`w-full flex items-center justify-between p-5 rounded-[24px] border transition-all active:scale-[0.98] ${method === m.id ? 'bg-violet-50 border-violet-200 text-violet-900 shadow-sm' : 'bg-white border-slate-100 text-slate-900 shadow-sm'}`}
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${method === m.id ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                            <m.icon size={20} className={method === m.id ? 'text-violet-600' : 'text-slate-400'} />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{m.label}</p>
                            <p className={`text-[10px] font-medium mt-0.5 ${method === m.id ? 'text-violet-600/70' : 'text-slate-400'}`}>{m.sub}</p>
                        </div>
                    </div>
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${method === m.id ? 'border-violet-600 bg-violet-600' : 'border-slate-200'}`}>
                        {method === m.id && <Check size={14} className="text-white" />}
                    </div>
                </button>
            ))}
        </div>

        {/* Action Button */}
        <div className="px-6 mb-10">
            <button 
                onClick={handleConfirm} 
                disabled={!repayAmount || isProcessing || loading} 
                className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
                {isProcessing ? "Authorizing Transfer..." : selectedLoanId ? "Settle Loan Early" : "Confirm Repayment"}
            </button>
        </div>

        {/* Active Loan Selection List */}
        <div className="px-6 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 mt-4">Select Loan to Settle</p>
            {loading && <div className="text-center py-10 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Active Loans...</div>}
            
            {!loading && activeLoans.length === 0 && (
                <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl">No Active Debt Found</p>
            )}

            {!loading && activeLoans.map((loan) => {
                const isSelected = selectedLoanId === loan.id;
                const settlementValue = loan.principal + loan.interestAccrued;

                return (
                    <button 
                        key={loan.id}
                        onClick={() => handleSelectLoan(loan)}
                        className={`w-full text-left bg-white rounded-[24px] p-5 border transition-all relative overflow-hidden ${isSelected ? 'border-violet-500 shadow-md ring-1 ring-violet-500' : 'border-slate-100 shadow-sm active:scale-[0.98]'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Loan ID: {loan.id}</p>
                                <h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4>
                            </div>
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-200'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Repayment Date</p>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                    <Calendar size={12} />
                                    <p className="text-xs font-bold">{new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Settlement Balance</p>
                                <p className="text-lg font-bold text-slate-900">{formatZar(settlementValue)}</p>
                            </div>
                        </div>

                        {isSelected && (
                            <div className="mt-4 pt-4 border-t border-violet-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                    <TrendingDown size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Early Settlement Benefit</p>
                                    <p className="text-[10px] text-slate-500 font-medium leading-tight">Saves ~{formatZar(loan.projectedMonthlyInterest)} in projected future interest costs.</p>
                                </div>
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
      </div>
    </div>
  );
};

export default RepayLiquidity;