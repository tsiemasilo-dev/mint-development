'use strict';

const express   = require('express');
const { Pool }  = require('pg');
const crypto    = require('crypto');

const app  = express();
const PORT = 3002;

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(c => { console.log('[neon] Connected to Neon DB'); c.release(); })
  .catch(e => console.error('[neon] DB connection error:', e.message));

// ── UPSERT conflict keys ──────────────────────────────────────────────────────
const UPSERT_KEYS = {
  securities_c              : ['symbol'],
  stock_returns_c           : ['symbol', 'as_of_date'],
  stock_intraday_c          : ['symbol', 'timestamp'],
  strategies_c              : ['id'],
  strategies_returns_c      : ['strategy_id', 'as_of_date'],
  stock_holdings_c          : ['id'],
  client_strategy_returns_c : ['user_id', 'strategy_id', 'as_of_date'],
};

// FK column in the querying table that references the joined table's id
const FK_MAP = {
  securities_c : 'security_id',
  strategies_c : 'strategy_id',
};

// Quote an identifier (column / table name) for PostgreSQL
const q = (name) => `"${name}"`;

// ── Auth helpers ──────────────────────────────────────────────────────────────
const JWT_SECRET = 'neon-test-secret';

function makeJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const TEST_USER = {
  id                : '00000000-0000-0000-0000-000000000001',
  email             : 'test@mintfinance.co.za',
  role              : 'authenticated',
  aud               : 'authenticated',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  created_at        : '2024-01-01T00:00:00Z',
  updated_at        : '2024-01-01T00:00:00Z',
  user_metadata     : { full_name: 'Test User' },
  app_metadata      : { provider: 'email', providers: ['email'] },
};

function makeSession() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600 * 24;
  return {
    access_token : makeJWT({
      sub          : TEST_USER.id,
      email        : TEST_USER.email,
      role         : 'authenticated',
      aud          : 'authenticated',
      iss          : 'neon-test',
      iat          : now,
      exp,
      user_metadata: TEST_USER.user_metadata,
      app_metadata : TEST_USER.app_metadata,
    }),
    token_type   : 'bearer',
    expires_in   : 3600 * 24,
    expires_at   : exp,
    refresh_token: crypto.randomBytes(20).toString('hex'),
    user         : TEST_USER,
  };
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    console.log(`[neon] ${req.method} ${req.path} select="${req.query.select || ''}"`);
  }
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers',
    'Content-Type, Authorization, apikey, Prefer, Accept, Range, Range-Unit, X-Client-Info');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Auth endpoints ────────────────────────────────────────────────────────────
app.post('/auth/v1/token',  (req, res) => res.json(makeSession()));
app.put ('/auth/v1/token',  (req, res) => res.json(makeSession()));
app.post('/auth/v1/otp',    (req, res) => res.json({ message_id: 'neon-test' }));
app.post('/auth/v1/verify', (req, res) => res.json(makeSession()));
app.post('/auth/v1/logout', (req, res) => res.sendStatus(204));
app.get ('/auth/v1/user',   (req, res) => res.json(TEST_USER));

// Express 5 uses named wildcards: *splat
app.all('/auth/v1/*splat',    (req, res) => res.json(req.method === 'GET' ? TEST_USER : makeSession()));
app.all('/storage/v1/*splat', (req, res) => res.status(200).json({ Key: '' }));
app.all('/realtime/v1/*splat',(req, res) => res.status(200).json({}));

// ── SQL helpers ───────────────────────────────────────────────────────────────

/**
 * Parse PostgREST select= param.
 * "id,symbol,securities_c(symbol,name)" →
 *   simpleCols: ['id','symbol'], joinCols: [{table:'securities_c', cols:['symbol','name']}]
 */
function parseSelect(selectStr) {
  const simpleCols = [];
  const joinCols   = [];
  for (const part of selectStr.split(',')) {
    const trimmed = part.trim();
    const m = trimmed.match(/^(\w+)\(([^)]+)\)$/);
    if (m) {
      joinCols.push({ table: m[1], cols: m[2].split(',').map(c => c.trim()) });
    } else if (trimmed) {
      simpleCols.push(trimmed);
    }
  }
  return { simpleCols, joinCols };
}

/**
 * Parse PostgREST filter query params → { where: string, values: any[] }
 * Param names are safe column names; values are validated against operator list.
 */
function parseFilters(query) {
  const SKIP   = new Set(['select', 'order', 'limit', 'offset']);
  const OP_MAP = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' };
  const conditions = [];
  const values     = [];

  for (const [key, raw] of Object.entries(query)) {
    if (SKIP.has(key)) continue;
    const val = Array.isArray(raw) ? raw[0] : raw;
    const m   = val.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.(.+)$/);
    if (!m) continue;
    const [, op, v] = m;
    const col = `t.${q(key)}`;

    if (op === 'is') {
      conditions.push(`${col} IS ${v === 'null' ? 'NULL' : 'NOT NULL'}`);
    } else if (op === 'in') {
      const items = v.replace(/^\(|\)$/g, '').split(',').map(s => s.trim());
      values.push(items);
      conditions.push(`${col} = ANY($${values.length})`);
    } else if (op === 'like') {
      values.push(v);
      conditions.push(`${col} LIKE $${values.length}`);
    } else if (op === 'ilike') {
      values.push(v);
      conditions.push(`${col} ILIKE $${values.length}`);
    } else {
      values.push(v);
      conditions.push(`${col} ${OP_MAP[op] || '='} $${values.length}`);
    }
  }

  return {
    where : conditions.length ? 'WHERE ' + conditions.join(' AND ') : '',
    values,
  };
}

function parseOrder(orderStr) {
  if (!orderStr) return '';
  const raw = Array.isArray(orderStr) ? orderStr[0] : orderStr;
  const parts = raw.split(',').map(p => {
    const bits = p.trim().split('.');
    const col  = bits[0];
    const dir  = bits[1] && bits[1].toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    return `${q(col)} ${dir}`;
  });
  return 'ORDER BY ' + parts.join(', ');
}

// ── GET /rest/v1/:table ───────────────────────────────────────────────────────
app.get('/rest/v1/:table', async (req, res) => {
  const { table }                                   = req.params;
  const { select = '*', order, limit = 1000, offset = 0 } = req.query;

  const { simpleCols, joinCols } = parseSelect(select);
  const { where, values }        = parseFilters(req.query);
  const orderClause              = parseOrder(order);
  const limitClause              = `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

  // Build SELECT columns (always quote to handle names like "1d_pct")
  const colExpr = (simpleCols.length === 0 || simpleCols[0] === '*')
    ? [`t.*`]
    : simpleCols.map(c => `t.${q(c)}`);

  // Build JOINs for embedded selects like securities_c(symbol)
  const joinSqlParts = [];
  const joinSelects  = [];
  const joinMeta     = [];

  joinCols.forEach(({ table: refTable, cols: refCols }, i) => {
    const alias = `__j${i}`;
    const fkCol = FK_MAP[refTable] || (refTable.replace(/_c$/, '') + '_id');
    joinSqlParts.push(`LEFT JOIN ${q(refTable)} ${alias} ON t.${q(fkCol)} = ${alias}.id`);
    refCols.forEach((rc, ci) => {
      const colAlias = `__jcol_${i}_${ci}`;
      joinSelects.push(`${alias}.${q(rc)} AS ${q(colAlias)}`);
      joinMeta.push({ alias: colAlias, refTable, refCol: rc });
    });
  });

  const selectExpr = [...colExpr, ...joinSelects].join(', ');
  const joinClause = joinSqlParts.join(' ');

  const sql = [
    `SELECT ${selectExpr}`,
    `FROM ${q(table)} t`,
    joinClause,
    where,
    orderClause,
    limitClause,
  ].filter(Boolean).join(' ');

  try {
    const result = await pool.query(sql, values);

    // Reshape rows: collect join-aliased cols back into nested objects
    const rows = result.rows.map(row => {
      const flat   = {};
      const nested = {};
      for (const [k, v] of Object.entries(row)) {
        const meta = joinMeta.find(m => m.alias === k);
        if (meta) {
          nested[meta.refTable] = nested[meta.refTable] || {};
          nested[meta.refTable][meta.refCol] = v;
        } else {
          flat[k] = v;
        }
      }
      return { ...flat, ...nested };
    });

    const prefer = req.headers['prefer'] || '';
    if (prefer.includes('count=exact')) {
      res.header('Content-Range', `0-${Math.max(rows.length - 1, 0)}/${rows.length}`);
    }
    res.json(rows);
  } catch (err) {
    console.error(`[neon] GET ${table}:`, err.message);
    if (err.message.includes('does not exist')) return res.json([]);
    res.status(400).json({ message: err.message, hint: '', details: '', code: '' });
  }
});

// ── POST /rest/v1/:table ──────────────────────────────────────────────────────
app.post('/rest/v1/:table', async (req, res) => {
  const { table }  = req.params;
  const prefer     = req.headers['prefer'] || '';
  const isUpsert   = prefer.includes('merge-duplicates');
  const returnRepr = prefer.includes('return=representation');

  const body = req.body;
  if (!body || (Array.isArray(body) && body.length === 0)) {
    return returnRepr ? res.status(201).json([]) : res.sendStatus(204);
  }

  const rows = Array.isArray(body) ? body : [body];

  try {
    const inserted = [];

    for (const row of rows) {
      const cols         = Object.keys(row);
      const vals         = Object.values(row);
      const colList      = cols.map(q).join(', ');
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

      let sql;
      if (isUpsert && UPSERT_KEYS[table]) {
        const conflictCols = UPSERT_KEYS[table];
        const conflictStr  = conflictCols.map(q).join(', ');
        const updateCols   = cols.filter(c => !conflictCols.includes(c));
        const updateClause = updateCols.length
          ? `DO UPDATE SET ${updateCols.map(c => `${q(c)} = EXCLUDED.${q(c)}`).join(', ')}`
          : 'DO NOTHING';
        sql = `INSERT INTO ${q(table)} (${colList}) VALUES (${placeholders})
               ON CONFLICT (${conflictStr}) ${updateClause} RETURNING *`;
      } else {
        sql = `INSERT INTO ${q(table)} (${colList}) VALUES (${placeholders})
               ON CONFLICT DO NOTHING RETURNING *`;
      }

      const r = await pool.query(sql, vals);
      if (r.rows.length) inserted.push(...r.rows);
    }

    if (returnRepr) return res.status(201).json(inserted);
    res.sendStatus(204);
  } catch (err) {
    console.error(`[neon] POST ${table}:`, err.message);
    res.status(400).json({ message: err.message, hint: '', details: '', code: '' });
  }
});

// ── PATCH /rest/v1/:table ─────────────────────────────────────────────────────
app.patch('/rest/v1/:table', async (req, res) => {
  const { table }  = req.params;
  const prefer     = req.headers['prefer'] || '';
  const returnRepr = prefer.includes('return=representation');
  const body       = req.body;

  if (!body || Object.keys(body).length === 0) return res.sendStatus(204);

  try {
    const cols       = Object.keys(body);
    const vals       = Object.values(body);
    const setClauses = cols.map((c, i) => `${q(c)} = $${i + 1}`).join(', ');

    const { where, values: wVals } = parseFilters(req.query);
    let idx = vals.length + 1;
    const whereReindexed = where.replace(/\$(\d+)/g, () => `$${idx++}`);

    const sql    = `UPDATE ${q(table)} SET ${setClauses} ${whereReindexed} RETURNING *`;
    const result = await pool.query(sql, [...vals, ...wVals]);

    if (returnRepr) return res.json(result.rows);
    res.sendStatus(204);
  } catch (err) {
    console.error(`[neon] PATCH ${table}:`, err.message);
    res.status(400).json({ message: err.message, hint: '', details: '', code: '' });
  }
});

// ── DELETE /rest/v1/:table ────────────────────────────────────────────────────
app.delete('/rest/v1/:table', async (req, res) => {
  const { table }  = req.params;
  const prefer     = req.headers['prefer'] || '';
  const returnRepr = prefer.includes('return=representation');

  try {
    const { where, values } = parseFilters(req.query);
    const sql    = `DELETE FROM ${q(table)} t ${where} RETURNING *`;
    const result = await pool.query(sql, values);

    if (returnRepr) return res.json(result.rows);
    res.sendStatus(204);
  } catch (err) {
    console.error(`[neon] DELETE ${table}:`, err.message);
    res.status(400).json({ message: err.message, hint: '', details: '', code: '' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', backend: 'neon' }));

app.listen(PORT, () => console.log(`[neon] API server listening on port ${PORT}`));
