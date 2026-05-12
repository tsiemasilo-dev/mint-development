import { supabase } from './supabase';
import { logDebug, CAT } from './debugLog.js';

let _cached = null;
let _expiry = 0;
let _inflight = null;

function parseExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : Date.now() + 3600000;
  } catch {
    return Date.now() + 3600000;
  }
}

export function clearSessionCache() {
  _cached = null;
  _expiry = 0;
  _inflight = null;
}

export function setCachedSession(session) {
  if (session?.access_token) {
    _cached = session;
    _expiry = parseExpiry(session.access_token);
  }
}

export async function getCachedSession() {
  const now = Date.now();

  // Return in-memory cache if the token is still valid (60s buffer before expiry)
  if (_cached?.access_token && _expiry > now + 60000) {
    return _cached;
  }

  // Deduplicate concurrent calls — if a fetch is already in flight, wait for it
  if (_inflight) {
    return _inflight;
  }

  _inflight = (async () => {
    try {
      logDebug(CAT.AUTH, '🔑 Session cache miss — fetching from Supabase (may hit auth lock)');

      const { data } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('session-timeout')), 5000)
        ),
      ]);

      const session = data?.session;
      if (session?.access_token) {
        _cached = session;
        _expiry = parseExpiry(session.access_token);
        logDebug(CAT.AUTH, '✅ Session cached successfully');
        return session;
      }
    } catch (err) {
      // If we timed out but have stale cache, prefer it over failing
      if (_cached?.access_token && _expiry > now) {
        logDebug(CAT.AUTH, '⚠️ Auth lock timed out — returning stale session cache');
        return _cached;
      }
      logDebug(CAT.AUTH, `❌ Session fetch failed: ${err.message}`);
    } finally {
      _inflight = null;
    }
    return null;
  })();

  return _inflight;
}
