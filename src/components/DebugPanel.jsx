import { useState, useEffect, useRef } from "react";
import { subscribeDebug, clearDebugEvents, CAT } from "../lib/debugLog.js";

const CAT_STYLE = {
  [CAT.VISIBILITY]:    { bg: "bg-blue-900",   badge: "bg-blue-500",   label: "VIS"  },
  [CAT.LOADING]:       { bg: "bg-yellow-900", badge: "bg-yellow-500", label: "LOAD" },
  [CAT.FETCH]:         { bg: "bg-green-900",  badge: "bg-green-600",  label: "FETCH"},
  [CAT.CHART]:         { bg: "bg-purple-900", badge: "bg-purple-500", label: "CHART"},
  [CAT.REALTIME]:      { bg: "bg-cyan-900",   badge: "bg-cyan-500",   label: "RT"   },
  [CAT.AUTH]:          { bg: "bg-red-900",    badge: "bg-red-500",    label: "AUTH" },
  [CAT.AUTO_REFRESH]:  { bg: "bg-orange-900", badge: "bg-orange-500", label: "REFR" },
  [CAT.WARN]:          { bg: "bg-yellow-900", badge: "bg-yellow-600", label: "WARN" },
};

const DEFAULT_STYLE = { bg: "bg-gray-800", badge: "bg-gray-500", label: "LOG" };

function fmt(ms) {
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-ZA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ALL_CATS = "all";

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState(ALL_CATS);
  const [tab, setTab] = useState("events");
  const listRef = useRef(null);

  useEffect(() => {
    return subscribeDebug(setEvents);
  }, []);

  const filtered = filter === ALL_CATS ? events : events.filter(e => e.category === filter);

  const summary = {
    reloads:      events.filter(e => e.message.includes("RELOAD triggered")).length,
    authLocks:    events.filter(e => e.category === CAT.AUTH).length,
    safetyTimers: events.filter(e => e.message.includes("Safety timer")).length,
    visibility:   events.filter(e => e.category === CAT.VISIBILITY).length,
    loadingTrue:  events.filter(e => e.message.includes("loading → TRUE")).length,
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-[9999] w-10 h-10 rounded-full bg-gray-900 border border-gray-600 text-white text-lg shadow-xl flex items-center justify-center"
        title="Open debug panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col pointer-events-none">
      <div className="mt-auto mx-2 mb-2 bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl flex flex-col pointer-events-auto"
        style={{ maxHeight: "70vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm font-bold">🐛 Debug</span>
            {summary.reloads > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500 text-white text-xs font-bold">
                {summary.reloads} reload{summary.reloads > 1 ? "s" : ""}
              </span>
            )}
            {summary.authLocks > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-xs font-bold">
                {summary.authLocks} lock{summary.authLocks > 1 ? "s" : ""}
              </span>
            )}
            {summary.safetyTimers > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-600 text-white text-xs font-bold">
                {summary.safetyTimers} timer{summary.safetyTimers > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={clearDebugEvents} className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800">Clear</button>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-sm px-2">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 py-1.5 border-b border-gray-800 shrink-0">
          {["events", "summary"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-2 py-1 rounded ${tab === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "summary" ? (
          <div className="p-3 space-y-2 overflow-auto text-xs font-mono">
            <SummaryRow label="Tab visibility changes" value={summary.visibility} warn={summary.visibility > 2} />
            <SummaryRow label="Auto-refresh reloads" value={summary.reloads} warn={summary.reloads > 0} />
            <SummaryRow label="Supabase auth lock timeouts" value={summary.authLocks} warn={summary.authLocks > 0} />
            <SummaryRow label="Safety timers fired" value={summary.safetyTimers} warn={summary.safetyTimers > 0} />
            <SummaryRow label="loading → TRUE events" value={summary.loadingTrue} warn={summary.loadingTrue > 2} />
            <div className="border-t border-gray-800 pt-2 text-gray-400 space-y-1">
              <p className="text-gray-300 font-bold">Common causes of infinite loading:</p>
              <p>• 🔒 Auth lock timeout → Supabase queries stall for 5 s</p>
              <p>• 🔄 Auto-refresh reload → full page refresh on tab focus</p>
              <p>• 👁  visibilitychange → loadData sets loading=true but hangs</p>
              <p>• ⏱ Safety timer = loading was never cleared normally</p>
            </div>
          </div>
        ) : (
          <>
            {/* Category filter */}
            <div className="flex gap-1 px-3 py-1.5 border-b border-gray-800 overflow-x-auto shrink-0">
              <FilterBtn cat={ALL_CATS} active={filter === ALL_CATS} label="All" count={events.length} onClick={() => setFilter(ALL_CATS)} />
              {Object.values(CAT).map(cat => {
                const count = events.filter(e => e.category === cat).length;
                if (count === 0) return null;
                const style = CAT_STYLE[cat] || DEFAULT_STYLE;
                return (
                  <FilterBtn key={cat} cat={cat} active={filter === cat} label={style.label} count={count} onClick={() => setFilter(cat)} />
                );
              })}
            </div>

            {/* Event list */}
            <div ref={listRef} className="overflow-y-auto flex-1 px-2 py-1 space-y-1 font-mono text-xs">
              {filtered.length === 0 && (
                <p className="text-gray-500 text-center py-4">No events yet. Switch tabs or interact with the app.</p>
              )}
              {filtered.map(evt => {
                const style = CAT_STYLE[evt.category] || DEFAULT_STYLE;
                return (
                  <div key={evt.id} className={`rounded-lg px-2 py-1.5 ${style.bg} flex gap-2 items-start`}>
                    <span className={`shrink-0 px-1 rounded text-white text-[10px] ${style.badge}`}>{style.label}</span>
                    <span className="text-gray-400 shrink-0">{fmtTime(evt.ts)}</span>
                    <span className="text-white break-all leading-snug">{evt.message}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, warn }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className={`px-2 py-0.5 rounded font-bold ${warn ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}`}>{value}</span>
    </div>
  );
}

function FilterBtn({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-[10px] px-2 py-0.5 rounded border ${active ? "border-white text-white" : "border-gray-700 text-gray-500 hover:text-gray-300"}`}
    >
      {label} {count}
    </button>
  );
}
