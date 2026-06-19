import { createClient } from "@supabase/supabase-js";

const REQUIRED_VARS = [
  { key: "VITE_SUPABASE_URL", label: "Supabase URL" },
  { key: "VITE_SUPABASE_ANON_KEY", label: "Supabase Anon Key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key" },
  { key: "RESEND_API_KEY", label: "Resend API Key" },
];

const OPTIONAL_VARS = [
  { key: "SUMSUB_APP_TOKEN", label: "Sumsub App Token (KYC)" },
  { key: "SUMSUB_SECRET_KEY", label: "Sumsub Secret Key (KYC)" },
  { key: "TRUID_CLIENT_ID", label: "TruID Client ID (bank linking)" },
  { key: "TRUID_CLIENT_SECRET", label: "TruID Client Secret (bank linking)" },
];

export default async function handler(req, res) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    environment_variables: {},
    supabase: {
      connected: false,
      news_articles_readable: false,
      news_articles_writable: false,
      total_articles: null,
      allbrf_articles: null,
      latest_allbrf: null,
      last_cron_sent: null,
      error: null,
    },
    resend: {
      configured: false,
    },
  };

  // 1. Check environment variables
  for (const v of REQUIRED_VARS) {
    report.environment_variables[v.key] = {
      label: v.label,
      set: !!process.env[v.key],
      required: true,
    };
  }
  for (const v of OPTIONAL_VARS) {
    report.environment_variables[v.key] = {
      label: v.label,
      set: !!process.env[v.key],
      required: false,
    };
  }

  // 2. Supabase checks
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const db = createClient(supabaseUrl, serviceRoleKey);
      report.supabase.connected = true;

      // Read test
      const { data: articles, error: readErr, count } = await db
        .from("News_articles")
        .select("title, published_at, source, content_types", { count: "exact" })
        .order("published_at", { ascending: false })
        .limit(1);

      if (readErr) {
        report.supabase.error = readErr.message;
      } else {
        report.supabase.news_articles_readable = true;
        report.supabase.total_articles = count;
      }

      // ALLBRF count + latest
      const { data: allbrf, count: allbrfCount } = await db
        .from("News_articles")
        .select("title, published_at, source", { count: "exact" })
        .filter("content_types", "cs", '"ALLBRF"')
        .order("published_at", { ascending: false })
        .limit(1);

      report.supabase.allbrf_articles = allbrfCount;
      if (allbrf && allbrf.length > 0) {
        report.supabase.latest_allbrf = {
          title: allbrf[0].title,
          published_at: allbrf[0].published_at,
          source: allbrf[0].source,
        };
      }

      // Write test
      const testId = Date.now();
      const { error: writeErr } = await db
        .from("News_articles")
        .insert({
          id: testId,
          doc_id: testId,
          title: "[DIAGNOSTIC TEST - auto-deleted]",
          source: "Mint Diagnose",
          published_at: new Date().toISOString(),
          body_text: "Auto-deleted diagnostic test row.",
          content_types: ["DIAG"],
        });

      if (!writeErr) {
        report.supabase.news_articles_writable = true;
        await db.from("News_articles").delete().eq("id", testId);
      } else {
        report.supabase.write_error = writeErr.message;
      }
    } catch (e) {
      report.supabase.error = e.message;
    }
  } else {
    report.supabase.error = "VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set";
  }

  // 3. Resend check
  report.resend.configured = !!process.env.RESEND_API_KEY;

  // Summary for quick reading
  const allRequiredSet = REQUIRED_VARS.every((v) => !!process.env[v.key]);
  report.summary = {
    status: allRequiredSet && report.supabase.news_articles_readable ? "READY" : "NOT READY",
    missing_required_vars: REQUIRED_VARS.filter((v) => !process.env[v.key]).map((v) => v.key),
    supabase_ok: report.supabase.news_articles_readable,
    resend_ok: report.resend.configured,
  };

  const httpStatus = allRequiredSet && report.supabase.news_articles_readable ? 200 : 503;
  return res.status(httpStatus).json(report);
}
