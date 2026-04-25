-- 009_signup_attribution.sql
-- Capture UTM attribution on org creation so we can measure which channels drive signups
-- (e.g., partner mastermind launch, Facebook groups, email outreach).

-- 1. Add attribution columns to organizations
ALTER TABLE organizations
  ADD COLUMN signup_source text NULL,
  ADD COLUMN signup_medium text NULL,
  ADD COLUMN signup_campaign text NULL,
  ADD COLUMN signup_referrer text NULL;

CREATE INDEX organizations_signup_source_idx ON organizations(signup_source) WHERE signup_source IS NOT NULL;

-- 2. Update RPC to accept optional attribution. Keeps existing call sites working
--    (params default to NULL).
CREATE OR REPLACE FUNCTION create_organization_for_user(
  org_id uuid,
  org_name text,
  org_slug text,
  default_pricing jsonb,
  signup_source text DEFAULT NULL,
  signup_medium text DEFAULT NULL,
  signup_campaign text DEFAULT NULL,
  signup_referrer text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO organizations (id, name, slug, signup_source, signup_medium, signup_campaign, signup_referrer)
  VALUES (org_id, org_name, org_slug, signup_source, signup_medium, signup_campaign, signup_referrer);

  INSERT INTO memberships (organization_id, user_id, role)
  VALUES (org_id, auth.uid(), 'owner');

  INSERT INTO pricing_settings (organization_id, settings_json)
  VALUES (org_id, default_pricing);
END;
$$;
