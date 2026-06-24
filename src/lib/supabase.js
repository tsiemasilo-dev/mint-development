import { createClient } from "@supabase/supabase-js";

const GLOBAL_CLIENT_KEY = "__mint_supabase_v2__";
const GLOBAL_CONFIG_KEY = "__mint_supabase_config__";

function _parseTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : Date.now() + 3600000;
  } catch {
    return Date.now() + 3600000;
  }
}

function createAndPatch(supabaseUrl, supabaseAnonKey) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: { timeout: 40000 },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const _origGetSession = client.auth.getSession.bind(client.auth);
  const _origGetUser = client.auth.getUser.bind(client.auth);
  const _origRefreshSession = client.auth.refreshSession.bind(client.auth);

  let _cached = null;
  let _expiry = 0;
  let _inflight = null;

  client.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      _cached = session;
      _expiry = _parseTokenExpiry(session.access_token);
    }
    if (event === "SIGNED_OUT") {
      _cached = null;
      _expiry = 0;
      _inflight = null;
    }
  });

  client.auth.getSession = async function patchedGetSession() {
    const now = Date.now();
    if (_cached?.access_token && _expiry > now + 60000) {
      return { data: { session: _cached }, error: null };
    }
    if (_inflight) return _inflight;
    _inflight = _origGetSession()
      .then(async (result) => {
        _inflight = null;
        const session = result?.data?.session;
        if (session?.access_token) {
          _cached = session;
          _expiry = _parseTokenExpiry(session.access_token);
          return result;
        }
        return result;
      })
      .catch((err) => {
        _inflight = null;
        if (_cached?.access_token) {
          console.warn("[supabase] getSession failed, returning cached session:", err.message);
          return { data: { session: _cached }, error: null };
        }
        return { data: { session: null }, error: err };
      });
    return _inflight;
  };

  client.auth.getUser = async function patchedGetUser(jwt) {
    if (jwt) return _origGetUser(jwt);
    if (_cached?.user && _cached?.access_token) {
      return { data: { user: _cached.user }, error: null };
    }
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      return { data: { user: sessionData.session.user }, error: null };
    }
    return _origGetUser();
  };

  return client;
}

// Fetch config from the server and initialize the Supabase client
async function initSupabase() {
  if (globalThis[GLOBAL_CLIENT_KEY]) return globalThis[GLOBAL_CLIENT_KEY];

  // Try VITE_ env vars first (works in some Replit setups)
  let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  // Fall back to server-side config endpoint if anon key not available
  if (!supabaseAnonKey) {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        supabaseUrl = cfg.supabaseUrl || supabaseUrl;
        supabaseAnonKey = cfg.supabaseAnonKey || "";
      }
    } catch (e) {
      console.warn("[supabase] Could not fetch /api/config:", e.message);
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables. Please check your secrets.");
    console.error("VITE_SUPABASE_URL:", supabaseUrl ? "set" : "not set");
    console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "set" : "not set");
    return null;
  }

  globalThis[GLOBAL_CONFIG_KEY] = { supabaseUrl, supabaseAnonKey };
  globalThis[GLOBAL_CLIENT_KEY] = createAndPatch(supabaseUrl, supabaseAnonKey);
  return globalThis[GLOBAL_CLIENT_KEY];
}

// Synchronous getter — returns existing client or null; call initSupabase() to bootstrap
export function getSupabaseClient() {
  return globalThis[GLOBAL_CLIENT_KEY] ?? null;
}

// Start initialization immediately (fire-and-forget; components use the promise)
export const supabaseReady = initSupabase();

// Legacy named export — null until initSupabase() resolves; safe for guards like `if (!supabase)`
export let supabase = globalThis[GLOBAL_CLIENT_KEY] ?? null;

// Patch the export once initialized so modules that imported `supabase` get the real client
supabaseReady.then((client) => {
  supabase = client;
  // Notify any listeners that supabase is ready
  window.dispatchEvent(new CustomEvent("supabase:ready", { detail: client }));
}).catch(() => {});
