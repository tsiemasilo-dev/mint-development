import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useProfile } from "../lib/useProfile";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import Skeleton from "../components/Skeleton";

const MarketsPage = ({ onOpenNotifications, onOpenStockDetail }) => {
  const { profile, loading: profileLoading } = useProfile();
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const fetchSecurities = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      let isMounted = true;

      try {
        const { data, error } = await supabase
          .from("securities")
          .select("*")
          .eq("is_active", true)
          .order("market_cap", { ascending: false, nullsFirst: false });

        if (error) throw error;

        if (isMounted) {
          setSecurities(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching securities:", error);
        if (isMounted) {
          setLoading(false);
        }
      }

      return () => {
        isMounted = false;
      };
    };

    fetchSecurities();
  }, []);

  const filteredSecurities = securities.filter((security) => {
    const matchesSearch =
      security.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      security.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      security.sector?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === "all") return matchesSearch;
    return matchesSearch && security.sector?.toLowerCase() === selectedFilter.toLowerCase();
  });

  const sectors = ["all", ...new Set(securities.map((s) => s.sector).filter(Boolean))];

  const formatMarketCap = (value) => {
    if (!value) return "—";
    const num = Number(value);
    if (num >= 1e12) return `R${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `R${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `R${(num / 1e6).toFixed(2)}M`;
    return `R${num.toFixed(2)}`;
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
            <header className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </header>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
        <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
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
                <p className="text-xs text-white/70">Markets</p>
                <p className="text-sm font-semibold">{displayName || "Welcome"}</p>
              </div>
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <section className="glass-card p-5 text-white">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-300" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Market Overview</p>
            </div>
            <p className="mt-3 text-2xl font-semibold">{securities.length} Securities</p>
            <p className="mt-2 text-sm text-white/80">Explore stocks, ETFs, and investment opportunities</p>
          </section>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search by name, symbol, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-12 py-3 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:bg-white/15 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-6 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {sectors.slice(0, 6).map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedFilter(sector)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                selectedFilter === sector
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {sector === "all" ? "All" : sector}
            </button>
          ))}
        </div>

        {filteredSecurities.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No securities found</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSecurities.map((security) => (
              <button
                key={security.id}
                onClick={() => onOpenStockDetail(security)}
                className="w-full rounded-3xl bg-white p-4 text-left shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  {security.logo_url ? (
                    <img
                      src={security.logo_url}
                      alt={security.symbol}
                      className="h-12 w-12 rounded-full border border-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">
                      {security.symbol?.substring(0, 2) || "—"}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {security.short_name || security.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {security.symbol} · {security.exchange}
                        </p>
                      </div>
                      {security.dividend_yield && (
                        <div className="text-right">
                          <p className="text-xs text-emerald-600">
                            {Number(security.dividend_yield).toFixed(2)}% yield
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {security.sector && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                          {security.sector}
                        </span>
                      )}
                      {security.pe && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                          P/E {Number(security.pe).toFixed(2)}
                        </span>
                      )}
                      {security.beta && (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                            security.beta > 1
                              ? "bg-orange-50 text-orange-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          β {Number(security.beta).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketsPage;
