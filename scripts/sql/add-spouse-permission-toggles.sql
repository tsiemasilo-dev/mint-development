-- Adds toggles on each child row so the primary user can control whether
-- their spouse can view / manage that child on the family dashboard.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS spouse_can_view BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS spouse_can_manage BOOLEAN NOT NULL DEFAULT false;

-- Optional: backfill existing rows to the defaults (covered by NOT NULL DEFAULT)
-- UPDATE family_members SET spouse_can_view = true, spouse_can_manage = false WHERE spouse_can_view IS NULL;
