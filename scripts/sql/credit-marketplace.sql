-- Run this in Supabase SQL editor to activate the new credit marketplace screens.
CREATE TABLE IF NOT EXISTS credit_marketplace_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_engine_score_id uuid,
  requested_amount numeric,
  requested_term_months integer,
  status text NOT NULL DEFAULT 'in_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_marketplace_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES credit_marketplace_applications(id) ON DELETE CASCADE,
  provider_id text NOT NULL,
  provider_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cma_user ON credit_marketplace_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_application ON credit_marketplace_selections(application_id);
