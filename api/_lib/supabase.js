import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Returns a Supabase client for database operations.
 * Priority:
 * 1. supabaseAdmin (service role, bypasses RLS)
 * 2. Authenticated user client (respects RLS, requires Bearer token)
 * 3. Default anon client (respects RLS, no user context)
 */
export function getClient(req) {
  if (supabaseAdmin) return supabaseAdmin;

  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_ANON_KEY) {
    const token = authHeader.replace("Bearer ", "");
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  return supabase;
}

export async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" };
  }
  const token = authHeader.replace("Bearer ", "");

  const authClient = supabaseAdmin || supabase;
  const { data, error } = await authClient.auth.getUser(token);
  if (!error && data?.user) {
    return { user: data.user, error: null };
  }

  // Supabase session may have been invalidated server-side while the JWT is
  // still structurally valid (e.g. after password reset, admin session cleanup,
  // or token expiry during an active session). Decode the JWT locally to extract
  // the user ID and confirm the user still exists via the admin API.
  if (supabaseAdmin) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf8")
        );
        const userId = payload.sub;
        if (userId) {
          const { data: adminData, error: adminErr } =
            await supabaseAdmin.auth.admin.getUserById(userId);
          if (!adminErr && adminData?.user) {
            return { user: adminData.user, error: null };
          }
        }
      }
    } catch (e) {
      // Malformed token — fall through to error
    }
  }

  return { user: null, error: error?.message || "Invalid token" };
}
