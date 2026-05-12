import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your secrets.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'not set');
}

// ── Global auth cache & deduplication patch ───────────────────────────────────
//
// Root problem: 40+ components call getSession() AND 28+ components call
// getUser() simultaneously on mount. Both fight over a Web Locks mutex inside
// @supabase/gotrue-js. In a throttled background tab the lock is orphaned,
// callers wait 5 s then fight with the 'steal' option → AbortError cascades →
// pages freeze in infinite skeleton / R0 balance.
//
// getUser() is worse: it makes a real network POST to /auth/v1/user every call,
// adding 200-800 ms latency even when the user object is already in the JWT.
//
// Fix — patch both methods at the singleton level:
//  • getSession: deduplicate concurrent calls via one in-flight promise; cache
//    result until 60 s before JWT expiry; return stale cache on AbortError.
//  • getUser:    return the user from the cached session immediately, with no
//    network round-trip. Falls back to a real call only when the cache is empty.
//
// Both patches are applied once when the client is first created and stored in
// globalThis so Vite HMR reloads reuse the same GoTrueClient instance (avoids
// the "Multiple GoTrueClient instances" console warning).
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CLIENT_KEY = '__mint_supabase_v2__';

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
  const _origGetUser    = client.auth.getUser.bind(client.auth);

  let _cached  = null;  // full session object
  let _expiry  = 0;     // ms timestamp: when access_token expires
  let _inflight = null; // shared Promise while a real getSession fetch is running

  // Pre-warm cache via auth state events. Fires immediately on subscription
  // with the current session, so cache is ready before any component mounts.
  client.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      _cached = session;
      _expiry = _parseTokenExpiry(session.access_token);
    }
    if (event === 'SIGNED_OUT') {
      _cached  = null;
      _expiry  = 0;
      _inflight = null;
    }
  });

  // ── Patch: getSession ──────────────────────────────────────────────────────
  client.auth.getSession = async function patchedGetSession() {
    const now = Date.now();

    // Serve from cache when token has > 60 s remaining
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
        // AbortError from Web Locks contention — serve stale cache instead
        if (_cached?.access_token) {
          console.warn('[supabase] getSession failed, returning cached session:', err.message);
          return { data: { session: _cached }, error: null };
        }
        return { data: { session: null }, error: err };
      });

    return _inflight;
  };

  // ── Patch: getUser ─────────────────────────────────────────────────────────
  // The original getUser() POSTs to /auth/v1/user on every call (~200-800 ms).
  // The session JWT already contains an up-to-date user object — return that
  // instead. Only fall back to the real network call when no session is cached.
  client.auth.getUser = async function patchedGetUser(jwt) {
    // If a specific JWT was passed, delegate to original (security-sensitive path)
    if (jwt) return _origGetUser(jwt);

    // If we have a cached session with a valid user, return it immediately
    if (_cached?.user && _cached?.access_token) {
      return { data: { user: _cached.user }, error: null };
    }

    // Cache miss — call patched getSession (which deduplicates + caches) then
    // extract the user from the result. This avoids a separate network request.
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      return { data: { user: sessionData.session.user }, error: null };
    }

    // Absolute fallback: real network call (e.g. very first page load with no
    // cached session in localStorage)
    return _origGetUser();
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
