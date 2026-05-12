import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { logDebug, CAT } from "./debugLog.js";

const globalState = {
  lastUpdated: null,
  isConnected: false,
  channel: null,
  listeners: new Set(),
  subscriberCount: 0,
  isSettingUp: false,
};

let teardownTimer = null;

function notifyListeners() {
  globalState.listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  globalState.listeners.add(listener);
  globalState.subscriberCount++;

  // Cancel any pending teardown caused by a brief unmount during navigation
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
    logDebug(CAT.REALTIME, "🔌 Realtime teardown cancelled — subscriber rejoined");
  }

  if (globalState.subscriberCount === 1 && !globalState.channel && !globalState.isSettingUp) {
    setupRealtimePrices();
  }

  return () => {
    globalState.listeners.delete(listener);
    globalState.subscriberCount--;

    if (globalState.subscriberCount <= 0) {
      // Delay teardown by 2 s to avoid thrashing during tab switches and navigation
      logDebug(CAT.REALTIME, "🔌 Realtime subscriber count → 0, scheduling teardown in 2 s");
      teardownTimer = setTimeout(() => {
        if (globalState.subscriberCount <= 0) {
          teardownRealtimePrices();
          globalState.subscriberCount = 0;
        }
        teardownTimer = null;
      }, 2000);
    }
  };
}

export function setupRealtimePrices() {
  if (!supabase || globalState.channel || globalState.isSettingUp) return;

  globalState.isSettingUp = true;
  logDebug(CAT.REALTIME, "🔌 Realtime prices subscription — SETTING UP");
  console.log("[realtime-prices] Setting up singleton subscription");

  globalState.channel = supabase
    .channel("prices-realtime-singleton")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "securities_c" },
      (payload) => {
        const changed = payload.new;
        if (
          changed.last_price !== undefined ||
          changed.change_price !== undefined ||
          changed.change_percent !== undefined ||
          changed.change_percentage !== undefined
        ) {
          console.log("[realtime-prices] Security price updated:", changed.symbol || changed.id);
          globalState.lastUpdated = Date.now();
          notifyListeners();
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "stock_returns_c" },
      (payload) => {
        console.log("[realtime-prices] New price record inserted for security:", payload.new?.security_id);
        globalState.lastUpdated = Date.now();
        notifyListeners();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "stock_holdings_c" },
      (payload) => {
        console.log("[realtime-prices] Holding updated:", payload.new?.id);
        globalState.lastUpdated = Date.now();
        notifyListeners();
      }
    )
    .subscribe((status, err) => {
      console.log("[realtime-prices] Subscription status:", status);
      if (err) {
        console.error("[realtime-prices] Subscription error:", err);
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[realtime-prices] Connection issue: ${status}. Realtime updates may be delayed.`);
      }

      const wasConnected = globalState.isConnected;
      globalState.isConnected = status === "SUBSCRIBED";
      globalState.isSettingUp = false;
      if (wasConnected !== globalState.isConnected) {
        notifyListeners();
      }
    });
}

export function teardownRealtimePrices() {
  if (globalState.channel) {
    logDebug(CAT.REALTIME, "🔌 Realtime prices subscription — TEARING DOWN");
    console.log("[realtime-prices] Tearing down subscription");
    supabase.removeChannel(globalState.channel);
    globalState.channel = null;
    globalState.isConnected = false;
    globalState.isSettingUp = false;
    notifyListeners();
  }
}

let snapshotRef = { lastUpdated: null, isConnected: false };

function getStableSnapshot() {
  const current = globalState;
  if (
    snapshotRef.lastUpdated !== current.lastUpdated ||
    snapshotRef.isConnected !== current.isConnected
  ) {
    snapshotRef = {
      lastUpdated: current.lastUpdated,
      isConnected: current.isConnected,
    };
  }
  return snapshotRef;
}

export const useRealtimePrices = () => {
  const state = useSyncExternalStore(subscribe, getStableSnapshot, getStableSnapshot);
  return state;
};
