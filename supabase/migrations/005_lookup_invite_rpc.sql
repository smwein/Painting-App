-- Public RPC to look up an invitation by token (returns email + org name)
-- Used by the AcceptInvite page to pre-fill signup form
create or replace function lookup_invite(invite_token text)
returns table(email text, org_name text, role invitation_role, expired boolean)
language sql
security definer
stable
as $$
  select
    i.email,
    o.name as org_name,
    i.role,
    (i.expires_at < now() or i.accepted_at is not null) as expired
  from invitations i
  join organizations o on o.id = i.organization_id
  where i.token = invite_token
  limit 1;
$$;
