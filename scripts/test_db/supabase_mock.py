#!/usr/bin/env python3
"""
Local Supabase REST API mock server backed by local Postgres.
Handles the subset of PostgREST API used by the Mint data scripts.

Usage:
    python3 scripts/test_db/supabase_mock.py
    
Then run any test script with SUPABASE_URL=http://localhost:5001
"""

import os
import re
import json
import decimal
import datetime
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, make_response

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL")

# Unique conflict columns per table (for ON CONFLICT ... DO UPDATE)
UPSERT_KEYS = {
    "securities_c"              : ["symbol"],
    "stock_returns_c"           : ["symbol", "as_of_date"],
    "stock_intraday_c"          : ["symbol", "timestamp"],
    "strategies_c"              : ["id"],
    "strategies_returns_c"      : ["strategy_id", "as_of_date"],
    "stock_holdings_c"          : ["id"],
    "client_strategy_returns_c" : ["user_id", "strategy_id", "as_of_date"],
}

# FK column name per referenced table (table -> fk_column in the querying table)
FK_MAP = {
    "securities_c" : "security_id",
    "strategies_c" : "strategy_id",
}


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def json_default(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    if hasattr(obj, "hex"):  # UUID
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def parse_select(select_str):
    """Parse 'id,symbol,securities_c(symbol)' into (columns, joins).
    joins = list of (ref_table, ref_col)
    """
    columns = []
    joins   = []
    for part in select_str.split(","):
        part = part.strip()
        m = re.match(r'^(\w+)\(([^)]+)\)$', part)
        if m:
            ref_table = m.group(1)
            for rc in m.group(2).split(","):
                joins.append((ref_table, rc.strip()))
        else:
            columns.append(part)
    return columns, joins


def parse_filters(args):
    """Turn 'symbol=eq.BHG.JO' into [('symbol', '=', 'BHG.JO')]."""
    skip   = {"select", "order", "limit", "offset"}
    op_map = {"eq": "=", "gte": ">=", "gt": ">", "lte": "<=", "lt": "<", "neq": "!="}
    result = []
    for key, values in args.items():
        if key in skip:
            continue
        for val in (values if isinstance(values, list) else [values]):
            m = re.match(r'^(eq|gte|gt|lte|lt|neq)\.(.+)$', val)
            if m:
                result.append((key, op_map[m.group(1)], m.group(2)))
    return result


def parse_order(order_str):
    if not order_str:
        return ""
    clauses = []
    for part in order_str.split(","):
        bits      = part.strip().split(".")
        col       = bits[0]
        direction = "DESC" if len(bits) > 1 and bits[1].lower() == "desc" else "ASC"
        clauses.append(f'"{col}" {direction}')
    return "ORDER BY " + ", ".join(clauses)


@app.route("/rest/v1/<table_name>", methods=["GET"])
def handle_get(table_name):
    args       = request.args.to_dict(flat=False)
    select_str = (args.get("select") or ["*"])[0]
    order_str  = (args.get("order")  or [None])[0]
    limit      = int((args.get("limit")  or [1000])[0])
    offset     = int((args.get("offset") or [0])[0])

    columns, joins = parse_select(select_str)
    filters        = parse_filters({k: v for k, v in args.items()})

    try:
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Main column expressions
        if columns == ["*"] or columns == []:
            col_exprs = ["t.*"]
        else:
            col_exprs = [f't."{c}"' for c in columns]

        # Join expressions — each join col gets a unique alias
        join_sql_parts  = []
        join_col_exprs  = []
        join_key_lookup = {}  # alias -> (ref_table, ref_col)

        for i, (ref_table, ref_col) in enumerate(joins):
            alias   = f"__j{i}"
            fk_col  = FK_MAP.get(ref_table, ref_table.replace("_c", "") + "_id")
            join_sql_parts.append(
                f'LEFT JOIN "{ref_table}" {alias} ON t."{fk_col}" = {alias}.id'
            )
            col_alias = f"__jcol_{i}"
            join_col_exprs.append(f'{alias}."{ref_col}" AS "{col_alias}"')
            join_key_lookup[col_alias] = (ref_table, ref_col)

        select_expr  = ", ".join(col_exprs + join_col_exprs)
        join_clause  = " ".join(join_sql_parts)
        order_clause = parse_order(order_str)

        where_parts = []
        params      = []
        for col, op, val in filters:
            where_parts.append(f't."{col}" {op} %s')
            params.append(val)
        where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        sql = f'''
            SELECT {select_expr}
            FROM "{table_name}" t
            {join_clause}
            {where_clause}
            {order_clause}
            LIMIT {limit} OFFSET {offset}
        '''

        cur.execute(sql, params or None)
        raw_rows = cur.fetchall()
        conn.close()

        # Re-shape rows: flatten join cols back into nested dicts
        rows = []
        for row in raw_rows:
            d      = dict(row)
            nested = {}
            flat   = {}
            for k, v in d.items():
                if k in join_key_lookup:
                    ref_table, ref_col = join_key_lookup[k]
                    nested.setdefault(ref_table, {})[ref_col] = v
                else:
                    flat[k] = v
            flat.update(nested)
            rows.append(flat)

        resp = make_response(json.dumps(rows, default=json_default))
        resp.headers["Content-Type"] = "application/json"
        return resp

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/rest/v1/<table_name>", methods=["POST"])
def handle_post(table_name):
    prefer = request.headers.get("Prefer", "")
    upsert = "resolution=merge-duplicates" in prefer

    body = request.get_json(force=True)
    if not body:
        return "", 204
    if isinstance(body, dict):
        body = [body]

    try:
        conn = get_conn()
        cur  = conn.cursor()

        for record in body:
            cols  = list(record.keys())
            vals  = list(record.values())
            col_str      = ", ".join(f'"{c}"' for c in cols)
            placeholders = ", ".join(["%s"] * len(vals))

            if upsert and table_name in UPSERT_KEYS:
                conflict_cols = UPSERT_KEYS[table_name]
                conflict_str  = ", ".join(f'"{c}"' for c in conflict_cols)
                update_parts  = ", ".join(
                    f'"{c}" = EXCLUDED."{c}"'
                    for c in cols if c not in conflict_cols
                )
                sql = f'''
                    INSERT INTO "{table_name}" ({col_str})
                    VALUES ({placeholders})
                    ON CONFLICT ({conflict_str}) DO UPDATE SET {update_parts}
                '''
            else:
                sql = f'''
                    INSERT INTO "{table_name}" ({col_str})
                    VALUES ({placeholders})
                    ON CONFLICT DO NOTHING
                '''

            cur.execute(sql, vals)

        conn.commit()
        conn.close()
        return "", 204

    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable not set.")
        exit(1)
    print("Local Supabase mock server starting on http://localhost:5001")
    print(f"Connected to: {DATABASE_URL.split('@')[-1]}")
    app.run(port=5001, debug=False)
