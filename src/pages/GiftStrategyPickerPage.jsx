import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Gift } from "lucide-react";
import { AreaChart, Area } from "recharts";
import { getPublicStrategies, formatChangePct, getChangeColor } from "../lib/strategyData";
import { calculateMinInvestmentSync } from "../lib/strategyUtils";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";

function MiniChart({ values }) {
  const data = values.map((v, i) => ({ i, v }));
  const gradId = useId();
  const isPositive = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  const color = isPositive ? "#7c3aed" : "#ef4444";
  return (
    <AreaChart width={80} height={40} data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.25} />
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
  const isFeatured = strategy.is_featured;

  const ytdValue = ytd?.ytd;
  const ytdPositive = ytdValue != null && ytdValue >= 0;
  const ytdColor = ytdValue == null ? "text-slate-400" : ytdPositive ? "text-emerald-600" : "text-red-500";

  return (
    <article className="flex-shrink-0 w-[88vw] max-w-[360px] snap-center bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200/60 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-900 uppercase leading-tight tracking-wide line-clamp-1">
            {strategy.name}
          </h3>
          <p className="text-[13px] text-slate-500 line-clamp-1">
            {strategy.risk_level || "Balanced"}{strategy.objective ? ` · ${strategy.objective}` : ""}
          </p>
          {minInvest && (
            <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">{minInvest}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-20 h-10">
          <MiniChart values={[20, 22, 21, 24, 26, 25, 28, 30, 29, 32]} />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="bg-violet-50 text-violet-700 text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide">
            {tag}
          </span>
        ))}
        {isFeatured && (
          <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide">
            Featured
          </span>
        )}
      </div>

      {/* YTD + Holdings */}
      <div className="flex justify-between items-end border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap mb-0.5">YTD return</p>
          <p className={`text-[15px] font-bold ${ytdColor}`}>
            {ytdValue != null ? formatChangePct(ytdValue) : "—"}
          </p>
          {ytd?.as_of_date && (
            <p className="text-[10px] text-slate-400 uppercase mt-0.5">
              {new Date(ytd.as_of_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>

        {holdingLogos.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {holdingLogos.map(h => (
                <div
                  key={h.sym}
                  className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0"
                >
                  {h.logo_url
                    ? <img src={h.logo_url} alt={h.sym} className="h-full w-full object-cover" />
                    : <span className="text-[8px] font-bold text-slate-500">{h.sym?.slice(0, 2)}</span>
                  }
                </div>
              ))}
              {extraCount > 0 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-semibold text-slate-500 flex-shrink-0">
                  +{extraCount}
                </div>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Holdings</span>
          </div>
        )}
      </div>

      {/* Gift button */}
      <button
        type="button"
        onClick={() => onGift(strategy)}
        className="w-full bg-violet-700 text-violet-100 py-4 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform duration-150 shadow-sm"
      >
        <Gift size={18} />
        Gift this strategy
      </button>
    </article>
  );
}

function SectionCarousel({ sector, strategies, ytdMap, securitiesMap, onGift }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const count = strategies.length;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || count <= 1) return;
    const idx = Math.min(count - 1, Math.round(el.scrollLeft / (el.scrollWidth / count)));
    setActiveIdx(idx);
  }

  const label = sector === "General" ? "Child Friendly" : sector;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em] px-5">{label}</h2>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
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

      {count > 1 && (
        <div className="flex justify-center gap-2">
          {strategies.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${i === activeIdx ? "w-2 h-2 bg-violet-700" : "w-2 h-2 bg-slate-300"}`}
            />
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Dark gradient header — matches MarketsPage */}
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Gift size={18} className="text-white/80" />
              GIFT A MINT BASKET
            </h1>
            <div className="h-10 w-10" />
          </header>

          {/* Info banner inside header */}
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3 ring-1 ring-white/10">
            <Gift size={16} className="text-white/80 shrink-0 mt-0.5" />
            <p className="text-[13px] text-white/80 leading-relaxed">
              Pick a strategy to gift. Your wallet is debited immediately — the recipient claims with their SA ID + a 6-digit code.
            </p>
          </div>
        </div>
      </div>

      <main className="w-full flex flex-col gap-6 pt-6 pb-10">

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-6 px-4">
            {[1, 2].map(i => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse ml-1" />
                <div className="flex gap-4">
                  <div className="min-w-[85%] h-64 rounded-xl bg-slate-200 animate-pulse" />
                  <div className="min-w-[85%] h-64 rounded-xl bg-slate-200 animate-pulse opacity-40" />
                </div>
              </div>
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-20">No strategies available.</p>
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
