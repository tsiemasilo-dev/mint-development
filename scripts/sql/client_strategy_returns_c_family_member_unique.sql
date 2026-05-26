-- Allow parent AND child to hold the same strategy on the same date without
-- the returns job colliding on upsert.
--
-- The original constraint was:
--   UNIQUE (user_id, strategy_id, as_of_date)
-- which collided whenever a parent and one of their children both held the same
-- strategy on the same as_of_date, because both rows share the parent's user_id.
--
-- New constraint includes family_member.
-- NULLS NOT DISTINCT (Postgres 15+) treats NULLs as equal, so each
-- (user_id, strategy_id, as_of_date) is still unique for the parent row
-- (family_member IS NULL) and for each child row (family_member = child.id).

BEGIN;

ALTER TABLE public.client_strategy_returns_c
  DROP CONSTRAINT IF EXISTS client_returns_user_strategy_date_unique;

ALTER TABLE public.client_strategy_returns_c
  ADD CONSTRAINT client_returns_user_strategy_date_member_unique
    UNIQUE NULLS NOT DISTINCT (user_id, strategy_id, as_of_date, family_member);

COMMIT;

-- ── Fallback for Postgres < 15 ──────────────────────────────────────────────
-- If your Supabase project is on Postgres 14 or older, NULLS NOT DISTINCT is
-- not supported. Use two partial unique indexes instead:
--
-- BEGIN;
--   ALTER TABLE public.client_strategy_returns_c
--     DROP CONSTRAINT IF EXISTS client_returns_user_strategy_date_unique;
--
--   CREATE UNIQUE INDEX client_returns_parent_unique
--     ON public.client_strategy_returns_c (user_id, strategy_id, as_of_date)
--     WHERE family_member IS NULL;
--
--   CREATE UNIQUE INDEX client_returns_child_unique
--     ON public.client_strategy_returns_c (user_id, strategy_id, as_of_date, family_member)
--     WHERE family_member IS NOT NULL;
-- COMMIT;
