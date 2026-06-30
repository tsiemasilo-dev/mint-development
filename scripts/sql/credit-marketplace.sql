-- Run this in Supabase SQL editor to activate the new credit marketplace screens.
-- One table only: selected providers live as a jsonb column on the application
-- row rather than a child table (loan_application was considered but its
-- monthly_repayable generated column + amount/interest CHECK constraint make
-- it unsafe to reuse for marketplace rows with no lender-set interest yet).
CREATE TABLE IF NOT EXISTS credit_marketplace_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_amount numeric,
  requested_term_months integer,
  status text NOT NULL DEFAULT 'in_review',
  selected_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cma_user ON credit_marketplace_applications(user_id);

-- Owner-only access (matches the protected user_onboarding pattern, not the
-- looser anon-readable loan_application table). Each user sees only their rows.
ALTER TABLE credit_marketplace_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own marketplace applications" ON credit_marketplace_applications;
CREATE POLICY "own marketplace applications"
  ON credit_marketplace_applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
