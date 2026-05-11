const MAX_EVENTS = 200;
const _events = [];
const _subscribers = new Set();
const _startTime = Date.now();

export const CAT = {
  VISIBILITY: 'visibility',
  LOADING: 'loading',
  FETCH: 'fetch',
  CHART: 'chart',
  REALTIME: 'realtime',
  AUTH: 'auth',
  AUTO_REFRESH: 'auto-refresh',
  WARN: 'warn',
};

export function logDebug(category, message, data = null) {
  const event = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    elapsed: Date.now() - _startTime,
    category,
    message,
    data,
  };
  _events.unshift(event);
  if (_events.length > MAX_EVENTS) _events.pop();
  _subscribers.forEach(fn => { try { fn([..._events]); } catch {} });
  return event;
}

export function subscribeDebug(fn) {
  _subscribers.add(fn);
  fn([..._events]);
  return () => _subscribers.delete(fn);
}

export function clearDebugEvents() {
  _events.length = 0;
  _subscribers.forEach(fn => { try { fn([]); } catch {} });
}

const _origWarn = console.warn;
console.warn = (...args) => {
  _origWarn(...args);
  const msg = args.map(a => (typeof a === 'string' ? a : '')).join(' ');
  if (msg.includes('not released within')) {
    logDebug(CAT.AUTH, '🔒 Supabase auth lock timed out (5 s) — all queries stalled', { raw: msg });
  } else if (msg.includes('CHANNEL_ERROR') || msg.includes('TIMED_OUT')) {
    logDebug(CAT.REALTIME, '⚠️ Realtime channel error', { raw: msg });
  } else if (msg.includes('safety timeout')) {
    logDebug(CAT.LOADING, '⏱ Safety timer fired — loading forced off', { raw: msg });
  }
};

document.addEventListener('visibilitychange', () => {
  logDebug(
    CAT.VISIBILITY,
    document.visibilityState === 'visible' ? '👁  Tab became VISIBLE' : '🙈 Tab went HIDDEN',
    { state: document.visibilityState, time: new Date().toLocaleTimeString() }
  );
});

window.addEventListener('mint-auto-refresh-check', (e) => {
  logDebug(CAT.AUTO_REFRESH, `🔍 Version check — current: ${e.detail?.current ?? '?'} latest: ${e.detail?.latest ?? '?'}`, e.detail);
});

window.addEventListener('mint-auto-refresh-reload', (e) => {
  logDebug(CAT.AUTO_REFRESH, `🚨 RELOAD triggered! v${e.detail?.from} → v${e.detail?.to}`, e.detail);
});
