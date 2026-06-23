-- AUM fee — follow-up to scripts/aum_fee_schema.sql. Safe to run once.

-- 1) Idempotency / gap-tolerance for the daily accrual. last_accrual_date lets the
--    engine accrue by ELAPSED days (today − last_accrual), so a missed run catches
--    up and a double run in one day is a no-op.
alter table public.aum_fee_accrual_segments
  add column if not exists last_accrual_date date;

-- 2) Keep the running accrual in FRACTIONAL cents (not whole cents) so we don't
--    round every day (which biases ~10c/month/position in MINT's favour). We round
--    to whole cents only at settlement, when cash actually moves.
alter table public.aum_fee_accrual_segments
  alter column accrued_fee_cents type numeric(20,4) using accrued_fee_cents::numeric;
