-- 008_retention.sql
-- Adds retention-offer tracking and cancellation_events table for the in-app cancel flow.

-- 1. Two new columns on organizations
ALTER TABLE organizations
  ADD COLUMN retention_offer_used_at timestamptz NULL,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;

-- 2. Cancellation event log (one row per terminal cancel-path action)
CREATE TABLE cancellation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (reason IN (
    'too_expensive','missing_features','switching_tools','seasonal','other'
  )),
  outcome text NOT NULL CHECK (outcome IN ('downgrade','accepted_offer','canceled')),
  plan_tier_at_event text NOT NULL CHECK (plan_tier_at_event IN ('basic','pro')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cancellation_events_org_idx ON cancellation_events(organization_id, created_at DESC);

-- 3. RLS: owners can read their org's events; writes are service-role-only (no INSERT policy)
ALTER TABLE cancellation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their org cancellation events"
  ON cancellation_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
