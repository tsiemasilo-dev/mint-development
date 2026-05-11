import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your secrets.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'not set');
}

// ── Global getSession cache & deduplication ──────────────────────────────────
//
// Problem: 40+ components call supabase.auth.getSession() simultaneously on mount.
// Each call tries to acquire a Web Locks mutex inside @supabase/gotrue-js.
// When the browser throttles JS in a background tab, the lock is orphaned and
// subsequent callers wait 5 s then fight each other with the 'steal' option,
// producing AbortError cascades that freeze pages with infinite skeleton loaders.
//
// Fix: Patch getSession at the singleton level so:
//  1. All concurrent calls share one in-flight promise (no lock contention)
//  2. Result is cached for the lifetime of the JWT (with 60 s expiry buffer)
//  3. If the underlying call fails, the stale cache is returned instead of
//     throwing — so callers get a session rather than an AbortError
//
// The client is stored in globalThis so HMR reloads of this module reuse the
// same instance instead of creating a second GoTrueClient with the same storage
// key (which triggers the "Multiple GoTrueClient instances" console warning).
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CLIENT_KEY = '__mint_supabase_v1__';

function _parseTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : Date.now() + 3600000;
  } catch {
    return Date.now() + 3600000;
  }
}

function createAndPatch() {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: { timeout: 40000 },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  const _origGetSession = client.auth.getSession.bind(client.auth);

  let _cached = null;
  let _expiry = 0;
  let _inflight = null;

  // Keep cache warm when auth state changes (fires immediately on subscribe
  // with the current session, so cache is pre-populated before any component
  // calls getSession).
  client.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      _cached = session;
      _expiry = _parseTokenExpiry(session.access_token);
    }
    if (event === 'SIGNED_OUT') {
      _cached = null;
      _expiry = 0;
      _inflight = null;
    }
  });

  client.auth.getSession = async function patchedGetSession() {
    const now = Date.now();

    // Return cache when token has > 60 s remaining
    if (_cached?.access_token && _expiry > now + 60000) {
      return { data: { session: _cached }, error: null };
    }

    // Deduplicate: all concurrent callers share one in-flight fetch
    if (_inflight) return _inflight;

    _inflight = _origGetSession()
      .then((result) => {
        _inflight = null;
        const session = result?.data?.session;
        if (session?.access_token) {
          _cached = session;
          _expiry = _parseTokenExpiry(session.access_token);
        }
        return result;
      })
      .catch((err) => {
        _inflight = null;
        // AbortError from Web Locks contention — return stale cache instead
        if (_cached?.access_token) {
          console.warn('[supabase] getSession failed, returning cached session:', err.message);
          return { data: { session: _cached }, error: null };
        }
        return { data: { session: null }, error: err };
      });

    return _inflight;
  };

  return client;
}

// Reuse the existing client across HMR reloads; only create once per page load
if (!globalThis[GLOBAL_CLIENT_KEY] && supabaseUrl && supabaseAnonKey) {
  globalThis[GLOBAL_CLIENT_KEY] = createAndPatch();
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? globalThis[GLOBAL_CLIENT_KEY]
  : null;
