-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Plan status enum
create type plan_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- Membership role enum
create type membership_role as enum ('owner', 'admin', 'estimator');

-- Bid status enum
create type bid_status as enum ('draft', 'sent', 'accepted', 'declined');

-- Invitation role enum (no 'owner' — only owner is the creator)
create type invitation_role as enum ('admin', 'estimator');

-- Organizations table
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_status plan_status not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- Memberships table (links users to organizations)
create table memberships (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'estimator',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

-- Pricing settings (one per org, stored as JSONB)
create table pricing_settings (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  settings_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bids table
create table bids (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  calculator_type text not null,
  customer_name text not null default '',
  bid_data jsonb not null default '{}'::jsonb,
  status bid_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invitations table
create table invitations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role invitation_role not null default 'estimator',
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_memberships_user on memberships(user_id);
create index idx_memberships_org on memberships(organization_id);
create index idx_bids_org on bids(organization_id);
create index idx_bids_created_by on bids(created_by);
create index idx_invitations_token on invitations(token);
create index idx_invitations_email on invitations(email);
