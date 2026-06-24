-- ============================================================================
-- AUM Management Fee — schema (additive, safe to run once)
-- Spec: MINT_AUM_Fee_Spec_v1.0. 0.99% p.a., actual/365 (366 leap), accrued daily,
-- settled month-end, taken ONLY from the 8% cash sleeve. No shares are ever sold.
--
-- Our cash sleeve is DERIVED (not a stored balance):
--   sleeve = Σ(transactions.buffer_cents − buffer_consumed_cents)  [the 8% buffer]
--          + strategy_rebalance_residuals.balance_cents            [rounding residual]
-- The AUM fee is recorded in its OWN accumulator (strategy_aum_fee_state) so it is
-- never conflated with broker slippage (buffer_consumed_cents). The sleeve calc
-- subtracts aum_fee_consumed_cents everywhere it is computed.
-- Keys mirror the rest of the app: user_id + family_member_id (NULL = the parent
-- account) + strategy_id. All money columns are in CENTS.
-- ============================================================================

-- 1) Per-position AUM state — the running accumulator the sleeve calc subtracts.
--    One row per (user/family_member, strategy). Created lazily by the engine.
create table if not exists public.strategy_aum_fee_state (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null,
  family_member_id         uuid,                              -- NULL = parent account
  strategy_id              uuid not null,
  aum_fee_consumed_cents   bigint not null default 0,         -- total fee taken from this sleeve (lifetime)
  aum_fee_receivable_cents bigint not null default 0,         -- unpaid IOU when the sleeve was short
  low_cash_flag            boolean not null default false,    -- true when last settlement couldn't be fully covered
  last_settled_period      date,                              -- first day of the last month settled (dedupe guard)
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index if not exists strategy_aum_fee_state_uq
  on public.strategy_aum_fee_state (user_id, coalesce(family_member_id, '00000000-0000-0000-0000-000000000000'::uuid), strategy_id);

-- 2) Accrual segments — one per capital event (initial / top_up / withdrawal),
--    so a month with mid-month changes is charged proportionally (spec §3.4).
create table if not exists public.aum_fee_accrual_segments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  family_member_id      uuid,
  strategy_id           uuid not null,
  period_month          date not null,                        -- first day of the billing month this segment belongs to
  segment_start_date    date not null,
  segment_end_date      date,                                 -- NULL while open (current segment)
  value_basis_cents     bigint not null default 0,            -- V(t): strategy value applied across this segment
  days_in_segment       integer not null default 0,
  accrued_fee_cents     bigint not null default 0,            -- value_basis × r_daily × days_in_segment
  trigger_type          text not null default 'initial',      -- initial | top_up | withdrawal | month_end | close
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists aum_seg_lookup
  on public.aum_fee_accrual_segments (user_id, strategy_id, period_month);
create index if not exists aum_seg_open
  on public.aum_fee_accrual_segments (strategy_id) where segment_end_date is null;

-- 3) Settled monthly ledger — the audit record of every fee actually charged.
create table if not exists public.aum_fee_transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null,
  family_member_id         uuid,
  strategy_id              uuid not null,
  fee_type                 text not null default 'AUM',
  period_start             date not null,                     -- first day of billing month
  period_end               date not null,                     -- last day of billing month
  fee_amount_cents         bigint not null default 0,         -- total fee due (sum of segments)
  deducted_from_cash_cents bigint not null default 0,         -- actually taken from the sleeve
  fee_receivable_cents     bigint not null default 0,         -- unpaid remainder (low-cash protocol)
  basis_value_cents        bigint not null default 0,         -- strategy value at settlement (for reference)
  segments_json            jsonb,                             -- frozen segment records, for audit/reconciliation
  settled_at               timestamptz not null default now()
);
create index if not exists aum_txn_user on public.aum_fee_transactions (user_id, strategy_id);
create unique index if not exists aum_txn_period_uq
  on public.aum_fee_transactions (user_id, coalesce(family_member_id, '00000000-0000-0000-0000-000000000000'::uuid), strategy_id, period_start);

-- 4) Daily revenue roll-up — so the CRM Finances page reads totals instead of
--    recomputing (AUM accrues over time and can't be derived from current holdings).
create table if not exists public.mint_revenue_daily (
  date                       date primary key,
  aum_fees_collected_cents   bigint not null default 0,
  broker_fees_collected_cents bigint not null default 0,
  custody_fees_collected_cents bigint not null default 0,
  transaction_fees_collected_cents bigint not null default 0,
  execution_spread_net_cents bigint not null default 0,       -- existing "MINT PROFIT" stream
  total_aum_basis_cents      bigint not null default 0,       -- total client AUM that day
  total_revenue_cents        bigint generated always as (
    aum_fees_collected_cents + broker_fees_collected_cents +
    custody_fees_collected_cents + transaction_fees_collected_cents +
    execution_spread_net_cents
  ) stored,
  updated_at                 timestamptz not null default now()
);

-- 5) Seed the configurable rate into app_settings('fees') so the CRM App Settings
--    tab exposes it (CEO can change 0.99% → 2% with no code change). The engine
--    reads getFeeConfig().AUM_FEE_RATE and falls back to 0.0099 if this is absent,
--    so this seed is optional but makes the value visible/editable immediately.
update public.app_settings
   set value = jsonb_set(value, '{aumFeeRate}', '0.0099', true)
 where key = 'fees'
   and not (value ? 'aumFeeRate');
