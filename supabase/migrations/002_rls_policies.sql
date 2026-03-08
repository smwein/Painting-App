-- Enable RLS on all tables
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table pricing_settings enable row level security;
alter table bids enable row level security;
alter table invitations enable row level security;

-- Helper function: get org IDs for the current user
create or replace function user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from memberships where user_id = auth.uid();
$$;

-- Helper function: get user's role in an org
create or replace function user_role_in_org(org_id uuid)
returns membership_role
language sql
security definer
stable
as $$
  select role from memberships
  where user_id = auth.uid() and organization_id = org_id
  limit 1;
$$;

-- Organizations: members can read their own orgs
create policy "Members can view their organization"
  on organizations for select
  using (id in (select user_org_ids()));

-- Organizations: owners can update their org
create policy "Owners can update their organization"
  on organizations for update
  using (user_role_in_org(id) = 'owner');

-- Organizations: anyone authenticated can insert (for onboarding)
create policy "Authenticated users can create organizations"
  on organizations for insert
  with check (auth.uid() is not null);

-- Memberships: members can view their org's memberships
create policy "Members can view org memberships"
  on memberships for select
  using (organization_id in (select user_org_ids()));

-- Memberships: owner/admin can insert memberships
create policy "Owner/admin can add members"
  on memberships for insert
  with check (
    user_role_in_org(organization_id) in ('owner', 'admin')
    or
    -- Allow self-insert during onboarding (no existing membership)
    (user_id = auth.uid() and not exists (
      select 1 from memberships where user_id = auth.uid()
    ))
  );

-- Memberships: owner can update roles
create policy "Owner can update member roles"
  on memberships for update
  using (user_role_in_org(organization_id) = 'owner');

-- Memberships: owner can remove members (not self)
create policy "Owner can remove members"
  on memberships for delete
  using (
    user_role_in_org(organization_id) = 'owner'
    and user_id != auth.uid()
  );

-- Pricing settings: members can read
create policy "Members can view pricing settings"
  on pricing_settings for select
  using (organization_id in (select user_org_ids()));

-- Pricing settings: owner/admin can update
create policy "Owner/admin can update pricing settings"
  on pricing_settings for update
  using (user_role_in_org(organization_id) in ('owner', 'admin'));

-- Pricing settings: owner/admin can insert
create policy "Owner/admin can insert pricing settings"
  on pricing_settings for insert
  with check (
    user_role_in_org(organization_id) in ('owner', 'admin')
    or
    -- Allow during onboarding
    organization_id in (select user_org_ids())
  );

-- Bids: members can read their org's bids
create policy "Members can view org bids"
  on bids for select
  using (organization_id in (select user_org_ids()));

-- Bids: any member can create bids
create policy "Members can create bids"
  on bids for insert
  with check (organization_id in (select user_org_ids()));

-- Bids: creator can update their own, owner/admin can update any
create policy "Creator or admin can update bids"
  on bids for update
  using (
    (created_by = auth.uid())
    or
    user_role_in_org(organization_id) in ('owner', 'admin')
  );

-- Bids: creator can delete their own, owner/admin can delete any
create policy "Creator or admin can delete bids"
  on bids for delete
  using (
    (created_by = auth.uid())
    or
    user_role_in_org(organization_id) in ('owner', 'admin')
  );

-- Invitations: owner/admin can manage invitations
create policy "Owner/admin can view invitations"
  on invitations for select
  using (organization_id in (select user_org_ids()));

create policy "Owner/admin can create invitations"
  on invitations for insert
  with check (user_role_in_org(organization_id) in ('owner', 'admin'));

create policy "Owner/admin can delete invitations"
  on invitations for delete
  using (user_role_in_org(organization_id) in ('owner', 'admin'));
