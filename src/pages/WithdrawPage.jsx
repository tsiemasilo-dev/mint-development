import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getCachedSession } from "../lib/sessionCache.js";

/* Sell / withdraw flow — reached by tapping the balance card on Home.
   Step 2: load real holdings (strategies) + single underlying assets, read-only.
   Sell buttons + the request-sell backend are added in the next steps. */

const fmtR = (rands) =>
  "R" +
  Number(rands || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function getToken() {
  const session = await getCachedSession();
  if (session?.access_token) return session.access_token;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export default function WithdrawPage({ userId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState([]); // grouped strategy positions
  const [singles, setSingles] = useState([]);        // individual underlying assets
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getToken();
        const res = token
          ? await fetch("/api/user/holdings", { headers: { Authorization: `Bearer ${token}` } })
          : null;
        const json = res && res.ok ? await res.json() : { holdings: [] };
        if (cancelled) return;
        // Only filled holdings (avg_fill > 0) — pending/gift buys aren't sellable yet.
        const holdings = (json.holdings || []).filter((h) => Number(h.avg_fill || 0) > 0);

        // Individual underlying assets (each sellable on its own in a later step).
        const singleAssets = holdings.map((h) => ({
          id: `sec:${h.id}`,
          kind: "security",
          holdingId: h.id,
          securityId: h.security_id,
          strategyId: h.strategy_id || null,
          symbol: h.symbol || "Asset",
          name: h.name || "Security",
          logo: h.logo_url || null,
          qty: Number(h.quantity || 0),
          value: Number(h.market_value || 0) / 100, // API market_value is cents
        }));

        // Strategy groupings (selling the strategy = liquidate its underlying).
        const stratMap = {};
        holdings.forEach((h) => {
          const sid = h.strategy_id;
          if (!sid) return;
          if (!stratMap[sid]) stratMap[sid] = { value: 0, count: 0, name: null, logo: null };
          stratMap[sid].value += Number(h.market_value || 0) / 100;
          stratMap[sid].count += 1;
        });
        const stratIds = Object.keys(stratMap);
        if (stratIds.length) {
          const { data: meta } = await supabase
            .from("strategies_c")
            .select("id, name, short_name, icon_url")
            .in("id", stratIds);
          (meta || []).forEach((m) => {
            if (stratMap[m.id]) {
              stratMap[m.id].name = m.short_name || m.name || "Strategy";
              stratMap[m.id].logo = m.icon_url || null;
            }
          });
        }
        const stratItems = stratIds.map((sid) => ({
          id: `strat:${sid}`,
          kind: "strategy",
          strategyId: sid,
          symbol: stratMap[sid].name || "Strategy",
          name: `${stratMap[sid].count} asset${stratMap[sid].count === 1 ? "" : "s"}`,
          logo: stratMap[sid].logo,
          value: stratMap[sid].value,
        }));

        if (cancelled) return;
        setStrategies(stratItems.sort((a, b) => b.value - a.value));
        setSingles(singleAssets.sort((a, b) => b.value - a.value));
      } catch (e) {
        if (!cancelled) setError("Could not load your holdings. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const totalValue = useMemo(
    () => strategies.reduce((s, x) => s + x.value, 0),
    [strategies]
  );

  const Row = ({ item }) => (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
        {item.logo ? (
          <img src={item.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-white/70">{String(item.symbol).slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{item.symbol}</div>
        <div className="text-xs text-white/50 truncate">
          {item.name}{item.kind === "security" && item.qty ? ` · ${item.qty} sh` : ""}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-white tabular-nums">{fmtR(item.value)}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-[#0b0b0f]/90 backdrop-blur border-b border-white/10">
        <button onClick={onBack} className="h-9 w-9 -ml-1 rounded-full flex items-center justify-center active:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Sell holdings</h1>
          <p className="text-xs text-white/50">Your strategies and single assets</p>
        </div>
      </header>

      <div className="px-4 pb-28 pt-4 space-y-6 max-w-xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5">
          <div className="text-xs text-white/50 uppercase tracking-wide">Portfolio value</div>
          <div className="text-3xl font-bold mt-1 tabular-nums">{fmtR(totalValue)}</div>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/50 text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your holdings…
          </div>
        ) : (
          <>
            {strategies.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">Strategies</h2>
                <div className="space-y-2">{strategies.map((s) => <Row key={s.id} item={s} />)}</div>
              </section>
            )}

            {singles.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">Single assets</h2>
                <div className="space-y-2">{singles.map((s) => <Row key={s.id} item={s} />)}</div>
              </section>
            )}

            {strategies.length === 0 && singles.length === 0 && (
              <div className="text-center text-white/50 text-sm py-16">You have no holdings yet.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
