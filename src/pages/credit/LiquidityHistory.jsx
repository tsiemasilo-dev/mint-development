import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ReceiptText, Search, ChevronRight } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const LiquidityHistory = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('loan_application')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) setHistoryData(data);
      setLoading(false);
    }
    fetchHistory();
  }, [profile?.id]);

  const filteredData = useMemo(() => {
    return historyData.filter(item =>
      item.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.principal_amount.toString().includes(searchQuery)
    );
  }, [historyData, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
            <ChevronLeft className="text-slate-400" />
            <h2 className="text-xl font-bold" style={{ fontFamily: fonts.display }}>Credit History</h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Ledger...</div>
        ) : (
          <div className="space-y-4">
            {paginatedData.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{formatZar(item.principal_amount)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm active:scale-90 transition-all"><ChevronLeft size={16} /></button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidityHistory;