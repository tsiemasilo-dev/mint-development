-- IT Incidents / Downtime Register
-- Run this in Supabase SQL editor to create the table and RLS policies

CREATE TABLE IF NOT EXISTS it_incidents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  affected_service text NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  start_time    timestamptz NOT NULL DEFAULT now(),
  resolved_time timestamptz,
  downtime_duration_minutes integer,
  description   text,
  root_cause    text,
  resolution_notes text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_it_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS it_incidents_updated_at ON it_incidents;
CREATE TRIGGER it_incidents_updated_at
  BEFORE UPDATE ON it_incidents
  FOR EACH ROW EXECUTE FUNCTION update_it_incidents_updated_at();

-- Enable RLS
ALTER TABLE it_incidents ENABLE ROW LEVEL SECURITY;

-- Service role (backend) can do everything
CREATE POLICY "service_role_all" ON it_incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users only can read (requires a role column on profiles; adjust predicate to match your schema)
-- If your profiles table uses a different admin indicator, update the sub-select below.
CREATE POLICY "admin_read" ON it_incidents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Index for common queries
CREATE INDEX IF NOT EXISTS it_incidents_status_idx ON it_incidents (status);
CREATE INDEX IF NOT EXISTS it_incidents_severity_idx ON it_incidents (severity);
CREATE INDEX IF NOT EXISTS it_incidents_start_time_idx ON it_incidents (start_time DESC);
