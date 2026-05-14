import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Gift } from "lucide-react";
import { AreaChart, Area } from "recharts";
import { getPublicStrategies, formatChangePct } from "../lib/strategyData";
import { calculateMinInvestmentSync } from "../lib/strategyUtils";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";

function MiniChart({ values, positive }) {
  const data = values.map((v, i) => ({ i, v }));
  const gradId = useId();
  const color = positive ? "#7c3aed" : "#7c3aed";
  return (
    <AreaChart width={64} height={32} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.2} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />
    </AreaChart>
  );
}

function StrategyCard({ strategy, ytd, holdingsBySymbol, onGift }) {
  const currency = strategy.base_currency || "R";
  const calcMin = calculateMinInvestmentSync(strategy, holdingsBySymbol);
  const minInvest = calcMin ? `Min. ${formatCurrency(calcMin, currency)}` : null;

  const holdings = Array.isArray(strategy.holdings) ? strategy.holdings : [];
  const holdingLogos = holdings.slice(0, 3).map(h => {
    const sym = h.ticker || h.symbol || h;
    const sec = holdingsBySymbol?.get(sym);
    return { sym, logo_url: sec?.logo_url };
  });
  const extraCount = Math.max(0, holdings.length - 3);

  const tags = strategy.tags?.length > 0 ? strategy.tags.slice(0, 2) : [strategy.risk_level || "Balanced"];

  const ytdValue = ytd?.ytd;
  const ytdPositive = ytdValue == null || ytdValue >= 0;
  const ytdColor = ytdValue == null ? "text-slate-400" : ytdPositive ? "text-emerald-500" : "text-red-500";

  return (
    <article className="flex-shrink-0 w-[85vw] max-w-xs bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between snap-center">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-bold text-[17px] leading-tight uppercase line-clamp-1">{strategy.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {strategy.risk_level || "Balanced"}{strategy.objective ? ` · ${strategy.objective}` : ""}
            </p>
          </div>
          <div className="flex-shrink-0 w-16 h-8">
            <MiniChart values={[20, 22, 21, 24, 26, 25, 28, 30, 29, 32]} positive={ytdPositive} />
          </div>
        </div>

        {/* Min investment */}
        {minInvest && (
          <p className="text-[10px] text-slate-400 uppercase font-medium mb-3">{minInvest}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-slate-50 text-[10px] font-semibold text-slate-600 rounded-md">
              {tag}
            </span>
          ))}
          {strategy.is_featured && (
            <span className="px-2 py-1 bg-violet-50 text-[10px] font-semibold text-violet-600 rounded-md">
              Featured
            </span>
          )}
        </div>

        {/* YTD + Holdings */}
        <div className="border-t border-slate-50 pt-4 mb-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">YTD Return</p>
              <p className={`font-bold text-xl ${ytdColor}`}>
                {ytdValue != null ? formatChangePct(ytdValue) : "—"}
              </p>
              {ytd?.as_of_date && (
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                  {new Date(ytd.as_of_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            {holdingLogos.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {holdingLogos.map(h => (
                    <div key={h.sym} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {h.logo_url
                        ? <img src={h.logo_url} alt={h.sym} className="h-full w-full object-cover" />
                        : <span className="text-[8px] font-bold text-slate-500">{h.sym?.slice(0, 2)}</span>
                      }
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 flex-shrink-0">
                      +{extraCount}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 ml-0.5">Holdings</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gift button */}
      <button
        type="button"
        onClick={() => onGift(strategy)}
        className="w-full bg-violet-700 hover:bg-violet-800 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
      >
        <Gift size={16} />
        Gift this strategy
      </button>
    </article>
  );
}

function SectionCarousel({ sector, strategies, ytdMap, securitiesMap, onGift }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || strategies.length <= 1) return;
    setActiveIdx(Math.min(strategies.length - 1, Math.round(el.scrollLeft / (el.scrollWidth / strategies.length))));
  }

  const label = sector === "General" ? "Child Friendly" : sector;

  return (
    <section className="mb-8">
      <div className="px-2 mb-4">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</h2>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {strategies.map(strategy => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            ytd={ytdMap[strategy.id]}
            holdingsBySymbol={securitiesMap}
            onGift={s => onGift({ ...s, calculatedMinInvestment: calculateMinInvestmentSync(s, securitiesMap) })}
          />
        ))}
        <div className="flex-shrink-0 w-4" />
      </div>
      {strategies.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {strategies.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-200 ${i === activeIdx ? "w-1.5 h-1.5 bg-violet-700" : "w-1.5 h-1.5 bg-slate-300"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function GiftStrategyPickerPage({ onBack, onNavigate }) {
  const [strategies, setStrategies] = useState([]);
  const [ytdMap, setYtdMap] = useState({});
  const [securitiesMap, setSecuritiesMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getPublicStrategies();
        if (cancelled) return;
        setStrategies(data || []);
        if (!data?.length || !supabase) return;

        const ids = data.map(s => s.id);
        const { data: returns } = await supabase
          .from("strategies_returns_c")
          .select("strategy_id, ytd_pct, as_of_date")
          .in("strategy_id", ids)
          .order("as_of_date", { ascending: false });

        const ytd = {};
        (returns || []).forEach(r => {
          if (!ytd[r.strategy_id]) {
            ytd[r.strategy_id] = { ytd: r.ytd_pct ? r.ytd_pct / 100 : null, as_of_date: r.as_of_date };
          }
        });
        if (!cancelled) setYtdMap(ytd);

        const tickers = [...new Set(data.flatMap(s =>
          (Array.isArray(s.holdings) ? s.holdings : []).map(h => h.ticker || h.symbol || h)
        ).filter(Boolean))];
        if (tickers.length) {
          const { data: secs } = await supabase
            .from("securities_c")
            .select("symbol, logo_url, last_price")
            .in("symbol", tickers);
          const secMap = new Map();
          (secs || []).forEach(s => secMap.set(s.symbol, s));
          if (!cancelled) setSecuritiesMap(secMap);
        }
      } catch (e) {
        console.error("[GiftStrategyPicker] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const sectors = [...new Set(strategies.map(s => s.sector || "General"))];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-slate-800">
      {/* Purple header */}
      <header className="bg-violet-700 text-white pt-12 pb-24 px-6 rounded-b-[40px] relative z-0">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift a Mint Basket
          </h1>
          <div className="w-10" />
        </div>

        {/* Info banner */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl flex gap-4 border border-white/10">
          <svg className="h-5 w-5 opacity-80 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs leading-relaxed opacity-90">
            Pick a strategy to gift. Your wallet is debited immediately — the recipient claims with their SA ID + a 6-digit code.
          </p>
        </div>
      </header>

      {/* Content overlaps header */}
      <main className="flex-grow -mt-16 relative z-10 px-4 pb-10">
        {loading ? (
          <div className="space-y-6 pt-2">
            {[1, 2].map(i => (
              <div key={i}>
                <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse mb-4 ml-2" />
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-[85vw] max-w-xs h-64 rounded-3xl bg-white animate-pulse" />
                  <div className="flex-shrink-0 w-[85vw] max-w-xs h-64 rounded-3xl bg-white animate-pulse opacity-50" />
                </div>
              </div>
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <div className="flex items-center justify-center pt-24">
            <p className="text-slate-400 text-sm">No strategies available.</p>
          </div>
        ) : (
          sectors.map(sector => {
            const sectorStrategies = strategies.filter(s => (s.sector || "General") === sector);
            if (!sectorStrategies.length) return null;
            return (
              <SectionCarousel
                key={sector}
                sector={sector}
                strategies={sectorStrategies}
                ytdMap={ytdMap}
                securitiesMap={securitiesMap}
                onGift={s => onNavigate?.("giftStrategyInvest", { strategy: s })}
              />
            );
          })
        )}
      </main>
    </div>
  );
}
