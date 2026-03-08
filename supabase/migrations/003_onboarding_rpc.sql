-- Server-side function for onboarding that bypasses RLS
-- Creates org + membership + default pricing in a single transaction
create or replace function create_organization_for_user(
  org_id uuid,
  org_name text,
  org_slug text,
  default_pricing jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Create the organization
  insert into organizations (id, name, slug)
  values (org_id, org_name, org_slug);

  -- Create owner membership
  insert into memberships (organization_id, user_id, role)
  values (org_id, auth.uid(), 'owner');

  -- Seed default pricing
  insert into pricing_settings (organization_id, settings_json)
  values (org_id, default_pricing);
end;
$$;
