import { useSyncExternalStore } from "react";

// Client-side fee values for DISPLAY. The server (api/_lib/fees.js) is always
// authoritative for what's charged; this just makes the UI show the same numbers
// the CTO set in the CRM, instead of hardcoding them in every screen.
//
// Usage inside a component:
//   const { ISIN_FEE_PER_ASSET, CASH_BUFFER_RATE, ... } = useFees();
// It returns the defaults immediately, then re-renders once /api/fees-config
// resolves (one fetch, shared across all consumers).

export const FEE_DEFAULTS = {
  ISIN_FEE_PER_ASSET:   69,
  BROKER_FEE_RATE:      0.0025,
  TRANSACTION_FEE_RATE: 0.038,
  CASH_BUFFER_RATE:     0.08,   // a.k.a. execution reserve
};

const num = (v, d) => (v == null || v === "" || isNaN(Number(v)) ? d : Number(v));

let _fees = { ...FEE_DEFAULTS };
const listeners = new Set();
let _fetchStarted = false;

function ensureFetch() {
  if (_fetchStarted) return;
  _fetchStarted = true;
  fetch("/api/fees-config")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.success || !j.fees) return;
      const f = j.fees;
      _fees = {
        ISIN_FEE_PER_ASSET:   num(f.ISIN_FEE_PER_ASSET,   FEE_DEFAULTS.ISIN_FEE_PER_ASSET),
        BROKER_FEE_RATE:      num(f.BROKER_FEE_RATE,      FEE_DEFAULTS.BROKER_FEE_RATE),
        TRANSACTION_FEE_RATE: num(f.TRANSACTION_FEE_RATE, FEE_DEFAULTS.TRANSACTION_FEE_RATE),
        CASH_BUFFER_RATE:     num(f.CASH_BUFFER_RATE ?? f.EXECUTION_RESERVE_RATE, FEE_DEFAULTS.CASH_BUFFER_RATE),
      };
      listeners.forEach((l) => l());
    })
    .catch(() => { /* keep defaults */ });
}

function subscribe(cb) {
  listeners.add(cb);
  ensureFetch();
  return () => listeners.delete(cb);
}
function getSnapshot() { return _fees; }

export function useFees() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
