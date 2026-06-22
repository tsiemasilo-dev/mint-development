import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MINS  = 15;
const LOGIN_LOCKOUT_SECS = 1800;

const loginSchema = z.object({
  email:    z.string().email("email must be a valid email address"),
  password: z.string().min(6, "password must be at least 6 characters").max(256),
});

function getClients() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const anon  = url && anonKey  ? createClient(url, anonKey)  : null;
  const admin = url && serviceKey ? createClient(url, serviceKey) : null;
  return { anon, admin };
}

// ── Supabase-backed attempt tracking ──────────────────────────────────────
// Falls back gracefully if the login_attempts table doesn't exist yet.

async function countRecentFailures(admin, emailHash) {
  try {
    const since = new Date(Date.now() - LOGIN_WINDOW_MINS * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("login_attempts")
      .select("id, attempted_at", { count: "exact" })
      .eq("email_hash", emailHash)
      .eq("success", false)
      .gte("attempted_at", since);
    if (error) return null;
    return data?.length ?? 0;
  } catch {
    return null;
  }
}

async function getOldestFailureTime(admin, emailHash) {
  try {
    const since = new Date(Date.now() - LOGIN_WINDOW_MINS * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("login_attempts")
      .select("attempted_at")
      .eq("email_hash", emailHash)
      .eq("success", false)
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: true })
      .range(LOGIN_MAX_FAILURES - 1, LOGIN_MAX_FAILURES - 1);
    if (error || !data?.length) return null;
    return new Date(data[0].attempted_at);
  } catch {
    return null;
  }
}

async function recordAttempt(admin, emailHash, ipAddress, success) {
  try {
    await admin.from("login_attempts").insert({ email_hash: emailHash, ip_address: ipAddress, success });
    // Prune old rows async — ignore errors
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    admin.from("login_attempts").delete().lt("attempted_at", cutoff).then(() => {});
  } catch {
    // Non-fatal
  }
}

async function clearFailures(admin, emailHash) {
  try {
    await admin.from("login_attempts").delete().eq("email_hash", emailHash).eq("success", false);
  } catch {
    // Non-fatal
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map(i => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`)
      .join("; ");
    return res.status(400).json({ success: false, error: `Validation failed — ${errors}` });
  }

  const { email, password } = parsed.data;
  const emailHash = createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
  const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null;

  const { anon, admin } = getClients();

  if (!anon) {
    return res.status(500).json({ success: false, error: "Auth service not configured." });
  }

  try {
    // 1. Check lockout (only when admin client is available)
    if (admin) {
      const failCount = await countRecentFailures(admin, emailHash);

      if (failCount !== null && failCount >= LOGIN_MAX_FAILURES) {
        const nthFailAt = await getOldestFailureTime(admin, emailHash);
        if (nthFailAt) {
          const unlockedAt  = new Date(nthFailAt.getTime() + LOGIN_LOCKOUT_SECS * 1000);
          const secondsLeft = Math.ceil((unlockedAt - Date.now()) / 1000);
          if (secondsLeft > 0) {
            console.warn(`[auth/login] Locked ${emailHash.slice(0, 8)}… — ${secondsLeft}s left`);
            return res.status(429).json({
              success: false,
              locked: true,
              lockedFor: secondsLeft,
              error: `Account temporarily locked. Try again in ${Math.ceil(secondsLeft / 60)} minutes.`,
            });
          }
        }
      }
    }

    // 2. Attempt Supabase sign-in
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    // 3. Record the attempt
    if (admin) {
      await recordAttempt(admin, emailHash, ipAddress, !error);
    }

    if (error) {
      let attemptsRemaining = null; // null = client uses its own counter

      if (admin) {
        const failCount = await countRecentFailures(admin, emailHash);
        if (failCount !== null) {
          attemptsRemaining = Math.max(0, LOGIN_MAX_FAILURES - failCount);
        }
      }

      const justLocked = attemptsRemaining === 0;
      console.warn(`[auth/login] Failed ${emailHash.slice(0, 8)}… remaining: ${attemptsRemaining ?? "unknown"}`);

      const resp = {
        success: false,
        locked: justLocked,
        lockedFor: justLocked ? LOGIN_LOCKOUT_SECS : null,
        error: justLocked
          ? "Account temporarily locked after too many failed attempts. Try again in 30 minutes."
          : "Incorrect email or password.",
      };
      // Only include attemptsRemaining when we actually know it (prevents client counter reset)
      if (attemptsRemaining !== null) resp.attemptsRemaining = attemptsRemaining;

      return res.status(401).json(resp);
    }

    // 4. Success — clear failure records
    if (admin) {
      await clearFailures(admin, emailHash);
    }

    console.log(`[auth/login] Success for user ${data.user?.id}`);
    return res.json({
      success: true,
      session: data.session,
      user: { id: data.user.id, email: data.user.email },
      attemptsRemaining: LOGIN_MAX_FAILURES,
    });

  } catch (err) {
    console.error("[auth/login] Unexpected error:", err.message);
    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({ success: false, error: isDev ? err.message : "An unexpected error occurred." });
  }
}
