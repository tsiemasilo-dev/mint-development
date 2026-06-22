import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import pkg from "pg";
import { z } from "zod";

const { Pool } = pkg;

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MINS  = 15;
const LOGIN_LOCKOUT_SECS = 1800;

const loginSchema = z.object({
  email:    z.string().email("email must be a valid email address"),
  password: z.string().min(6, "password must be at least 6 characters").max(256),
});

function getSupabaseAnonClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

let _pool = null;
function getPgPool() {
  if (!_pool && process.env.DATABASE_URL) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  }
  return _pool;
}

async function ensureLoginAttemptsTable(pool) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id           BIGSERIAL PRIMARY KEY,
        email_hash   TEXT NOT NULL,
        ip_address   TEXT,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        success      BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email_hash ON login_attempts(email_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC)`);
  } finally {
    client.release();
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
  const ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;

  const pool = getPgPool();

  try {
    if (pool) {
      await ensureLoginAttemptsTable(pool).catch(() => {});

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM login_attempts
         WHERE email_hash = $1 AND success = FALSE
         AND attempted_at > NOW() - INTERVAL '${LOGIN_WINDOW_MINS} minutes'`,
        [emailHash]
      );
      const failCount = parseInt(countRows[0].cnt, 10);

      if (failCount >= LOGIN_MAX_FAILURES) {
        const { rows: nthRows } = await pool.query(
          `SELECT attempted_at FROM login_attempts
           WHERE email_hash = $1 AND success = FALSE
           AND attempted_at > NOW() - INTERVAL '${LOGIN_WINDOW_MINS} minutes'
           ORDER BY attempted_at ASC LIMIT 1 OFFSET ${LOGIN_MAX_FAILURES - 1}`,
          [emailHash]
        );
        if (nthRows.length > 0) {
          const nthFailAt  = new Date(nthRows[0].attempted_at);
          const unlockedAt = new Date(nthFailAt.getTime() + LOGIN_LOCKOUT_SECS * 1000);
          const secondsLeft = Math.ceil((unlockedAt - Date.now()) / 1000);
          if (secondsLeft > 0) {
            console.warn(`[auth/login] Account locked for ${emailHash.slice(0, 8)}… — ${secondsLeft}s remaining`);
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

    const supabase = getSupabaseAnonClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Auth service not configured." });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (pool) {
      pool.query(
        `INSERT INTO login_attempts (email_hash, ip_address, success) VALUES ($1, $2, $3)`,
        [emailHash, ipAddress, !error]
      ).catch(e => console.error("[auth/login] Failed to record attempt:", e.message));

      pool.query(`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '2 hours'`)
        .catch(() => {});
    }

    if (error) {
      let attemptsRemaining = LOGIN_MAX_FAILURES;
      if (pool) {
        const { rows } = await pool.query(
          `SELECT COUNT(*) AS cnt FROM login_attempts
           WHERE email_hash = $1 AND success = FALSE
           AND attempted_at > NOW() - INTERVAL '${LOGIN_WINDOW_MINS} minutes'`,
          [emailHash]
        );
        attemptsRemaining = Math.max(0, LOGIN_MAX_FAILURES - parseInt(rows[0].cnt, 10));
      }

      const justLocked = attemptsRemaining === 0;
      console.warn(`[auth/login] Failed for ${emailHash.slice(0, 8)}… — remaining: ${attemptsRemaining}`);
      return res.status(401).json({
        success: false,
        locked: justLocked,
        attemptsRemaining,
        lockedFor: justLocked ? LOGIN_LOCKOUT_SECS : null,
        error: justLocked
          ? "Account temporarily locked after too many failed attempts. Try again in 30 minutes."
          : "Incorrect email or password.",
      });
    }

    if (pool) {
      pool.query(
        `DELETE FROM login_attempts WHERE email_hash = $1 AND success = FALSE`,
        [emailHash]
      ).catch(() => {});
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
