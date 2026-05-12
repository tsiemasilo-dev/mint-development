-- Add is_child_friendly flag to strategies_c
-- Run this in Supabase SQL editor

ALTER TABLE strategies_c
  ADD COLUMN IF NOT EXISTS is_child_friendly boolean NOT NULL DEFAULT false;

-- Mark which strategies are appropriate for child/minor accounts.
-- Update these to true for strategies you want visible in the child invest modal.
-- Example: UPDATE strategies_c SET is_child_friendly = true WHERE risk_level IN ('low', 'medium');
