-- RPC to fetch team members with email/name from auth.users
create or replace function get_team_members(org_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role membership_role,
  created_at timestamptz,
  email text,
  display_name text
)
language sql
security definer
as $$
  select
    m.id,
    m.user_id,
    m.role,
    m.created_at,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email) as display_name
  from memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = org_id
    and m.organization_id in (
      select organization_id from memberships where user_id = auth.uid()
    );
$$;
