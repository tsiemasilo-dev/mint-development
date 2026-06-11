#!/usr/bin/env node
/**
 * Backfill Sumsub identity documents into our own storage + DB, so KYC data
 * survives Sumsub deactivation. Writes into the SAME shape the CRM produces:
 *   - bucket  : `sumsub-archive`
 *   - path    : {external_user_id}/{applicant_id}/{inspection_id}/{imageId}-{fileName}
 *   - table   : public.sumsub_document_archive  (upsert on profile_id,image_id)
 *
 * Targets users that have a pack_details record but NO rows in
 * sumsub_document_archive (the "gap"). Users whose applicant is 404 on the
 * configured Sumsub account are reported and skipped (their docs aren't
 * retrievable on these creds — re-run with a different account's creds).
 *
 * Reads creds from .env: VITE_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY, SUMSUB_BASE_URL.
 *
 * Usage:
 *   node scripts/backfill-sumsub-archive.mjs --dry-run            # plan only, no writes
 *   node scripts/backfill-sumsub-archive.mjs --user=<uuid>        # one user (real)
 *   node scripts/backfill-sumsub-archive.mjs                      # all gap users (real)
 *   node scripts/backfill-sumsub-archive.mjs --limit=3            # first N gap users
 */
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── env ───────────────────────────────────────────────────────────────────────
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
let SUMSUB_BASE = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
if (!/^https?:\/\//.test(SUMSUB_BASE)) SUMSUB_BASE = "https://" + SUMSUB_BASE;
const BUCKET = "sumsub-archive";

for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_KEY, SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY })) {
  if (!v) { console.error(`Missing required env: ${k}`); process.exit(1); }
}

// ── flags ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ONLY = (args.find((a) => a.startsWith("--user=")) || "").split("=")[1] || null;
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 0;

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Sumsub helpers ──────────────────────────────────────────────────────────────
const sign = (ts, method, path, body = "") =>
  crypto.createHmac("sha256", SUMSUB_SECRET_KEY).update(ts + method + path + body).digest("hex");

async function sumsub(path, { binary = false } = {}) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const res = await fetch(`${SUMSUB_BASE}${path}`, {
    headers: {
      Accept: binary ? "*/*" : "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": sign(ts, "GET", path),
    },
  });
  if (binary) return { status: res.status, buffer: res.ok ? Buffer.from(await res.arrayBuffer()) : null, contentType: res.headers.get("content-type") };
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

const lookupApplicant = (extId) =>
  sumsub(`/resources/applicants/-;externalUserId=${encodeURIComponent(extId)}/one`);

async function getResources(applicantId) {
  const r = await sumsub(`/resources/applicants/${applicantId}/metadata/resources`);
  if (r.status !== 200) return null;
  return Array.isArray(r.body?.items) ? r.body.items : (Array.isArray(r.body) ? r.body : []);
}

// Download a document image. Inspection-scoped endpoint first, applicant fallback.
async function downloadImage(inspectionId, applicantId, imageId) {
  let r = await sumsub(`/resources/inspections/${inspectionId}/resources/${imageId}`, { binary: true });
  if (r.status === 200 && r.buffer) return r;
  r = await sumsub(`/resources/applicants/${applicantId}/image/${imageId}`, { binary: true });
  return r.status === 200 && r.buffer ? r : null;
}

const mimeFor = (fileType, ct) => {
  const t = (fileType || "").toLowerCase();
  if (t === "jpg" || t === "jpeg") return "image/jpeg";
  if (t === "png") return "image/png";
  if (t === "pdf") return "application/pdf";
  if (t === "webp") return "image/webp";
  if (ct && ct !== "application/octet-stream") return ct.split(";")[0];
  return "application/octet-stream";
};

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nBackfill sumsub_document_archive  ${DRY ? "[DRY RUN]" : "[LIVE]"}  token=${SUMSUB_APP_TOKEN.slice(0, 12)}…\n`);

  // gap = pack_details users with no archive rows
  const { data: packs } = await db.from("user_onboarding_pack_details").select("user_id, pack_details");
  const { data: archRows } = await db.from("sumsub_document_archive").select("external_user_id");
  const archived = new Set((archRows || []).map((r) => r.external_user_id));
  let gap = (packs || []).filter((p) => !archived.has(p.user_id));
  if (ONLY) gap = gap.filter((p) => p.user_id === ONLY);
  if (LIMIT) gap = gap.slice(0, LIMIT);

  console.log(`Gap users to process: ${gap.length}\n`);
  const summary = { users_archived: 0, files_uploaded: 0, users_no_docs: 0, users_not_found: 0, errors: 0 };

  for (const { user_id } of gap) {
    try {
      const look = await lookupApplicant(user_id);
      if (look.status !== 200 || !look.body?.id) {
        console.log(`  x ${user_id}: applicant not found on this account (${look.status}) - skipped`);
        summary.users_not_found++;
        continue;
      }
      const applicant = look.body;
      const applicantId = applicant.id;
      const inspectionId = applicant.inspectionId || applicantId;
      const reviewStatus = applicant.review?.reviewStatus || "completed";
      const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer || null;

      const items = await getResources(applicantId);
      if (!items || items.length === 0) {
        console.log(`  o ${user_id}: 0 documents in Sumsub - nothing to archive`);
        summary.users_no_docs++;
        continue;
      }

      let uploaded = 0;
      for (const item of items) {
        const imageId = String(item.id);
        const fileName = item.fileMetadata?.fileName || `${imageId}.jpg`;
        const fileType = item.fileMetadata?.fileType || "jpeg";
        // Sanitize only the storage KEY (spaces/colons/etc. break storage paths);
        // the original name is preserved in the file_name column + resource_metadata.
        const safeName = fileName.replace(/[^\w.\-]+/g, "_");
        const storagePath = `${user_id}/${applicantId}/${inspectionId}/${imageId}-${safeName}`;

        if (DRY) {
          console.log(`     would archive ${imageId} (${item.idDocDef?.idDocType || item.source || "?"}) -> ${storagePath}`);
          uploaded++;
          continue;
        }

        const dl = await downloadImage(inspectionId, applicantId, imageId);
        if (!dl) { console.log(`     ! failed download ${imageId}`); summary.errors++; continue; }
        const mime = mimeFor(fileType, dl.contentType);

        const up = await db.storage.from(BUCKET).upload(storagePath, dl.buffer, { contentType: mime, upsert: true });
        if (up.error) { console.log(`     ! upload ${imageId}: ${up.error.message}`); summary.errors++; continue; }

        const row = {
          profile_id: user_id,
          external_user_id: user_id,
          applicant_id: applicantId,
          inspection_id: inspectionId,
          image_id: imageId,
          file_name: fileName,
          file_type: fileType,
          mime_type: mime,
          content_size_bytes: item.fileMetadata?.fileSize || dl.buffer.length,
          storage_bucket: BUCKET,
          storage_path: storagePath,
          resource_metadata: item,
          review_status: reviewStatus,
          review_answer: item.reviewResult?.reviewAnswer || reviewAnswer,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const ins = await db.from("sumsub_document_archive").upsert(row, { onConflict: "profile_id,image_id" });
        if (ins.error) { console.log(`     ! db upsert ${imageId}: ${ins.error.message}`); summary.errors++; continue; }
        uploaded++;
        summary.files_uploaded++;
      }
      console.log(`  + ${user_id}: ${uploaded} file(s) ${DRY ? "(dry)" : "archived"}`);
      if (uploaded > 0) summary.users_archived++;
    } catch (err) {
      console.log(`  ! ${user_id}: ${err.message}`);
      summary.errors++;
    }
  }

  console.log(`\n-- Summary --`);
  console.log(JSON.stringify(summary, null, 2));
  if (DRY) console.log("\n(DRY RUN - no files or rows were written.)");
}

main().catch((e) => { console.error(e); process.exit(1); });
