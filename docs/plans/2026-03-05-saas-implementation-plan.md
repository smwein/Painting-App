# SaaS Multi-Tenant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-tenant painting bid calculator into a multi-tenant SaaS with Supabase, Stripe billing, team accounts, and a marketing landing page.

**Architecture:** Add Supabase (Auth + Postgres + Edge Functions) alongside existing Firebase. Build all new SaaS infrastructure first, then swap out Firebase stores last. Existing calculator/settings components are never modified — only the data layer beneath them changes.

**Tech Stack:** React 19, Vite, Tailwind CSS, Zustand, Supabase (Auth, Postgres, Edge Functions), Stripe (Checkout, Customer Portal, Webhooks)

---

## Phase 1: Supabase Setup & Database Schema

### Task 1: Initialize Supabase Project

**Files:**
- Create: `src/config/supabase.ts`
- Create: `.env.local` (gitignored)
- Modify: `.gitignore`

**Step 1: Install Supabase client**

Run: `npm install @supabase/supabase-js`

**Step 2: Create Supabase config file**

Create `src/config/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Step 3: Create `.env.local`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Add to `.gitignore`**

Ensure `.env.local` is in `.gitignore` (Vite already does this by default, verify).

**Step 5: Commit**

```bash
git add src/config/supabase.ts .gitignore package.json package-lock.json
git commit -m "feat: add Supabase client configuration"
```

---

### Task 2: Create Database Schema (SQL Migration)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create the migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add initial database schema migration"
```

---

### Task 3: Row Level Security Policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Create RLS migration**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/migrations/002_rls_policies.sql
git commit -m "feat: add Row Level Security policies for multi-tenancy"
```

---

### Task 4: Supabase TypeScript Types

**Files:**
- Create: `src/types/supabase.types.ts`

**Step 1: Create type definitions**

Create `src/types/supabase.types.ts` with the Database type that matches the schema. This provides type safety for all Supabase queries.

```typescript
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type MembershipRole = 'owner' | 'admin' | 'estimator';
export type BidStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvitationRole = 'admin' | 'estimator';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_status: PlanStatus;
          trial_ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_status?: PlanStatus;
          trial_ends_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: MembershipRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
      pricing_settings: {
        Row: {
          id: string;
          organization_id: string;
          settings_json: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          settings_json: Record<string, unknown>;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pricing_settings']['Insert']>;
      };
      bids: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          calculator_type: string;
          customer_name: string;
          bid_data: Record<string, unknown>;
          status: BidStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          calculator_type: string;
          customer_name?: string;
          bid_data: Record<string, unknown>;
          status?: BidStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: InvitationRole;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: InvitationRole;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>;
      };
    };
  };
}
```

**Step 2: Commit**

```bash
git add src/types/supabase.types.ts
git commit -m "feat: add Supabase database TypeScript types"
```

---

## Phase 2: Auth (Supabase Replaces Firebase)

### Task 5: Create Supabase Auth Store

**Files:**
- Create: `src/store/supabaseAuthStore.ts`

**Step 1: Build the new auth store**

This store mirrors the existing `useAuthStore` interface exactly but uses Supabase Auth. We create it as a separate file first — the swap happens later.

```typescript
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { MembershipRole } from '../types/supabase.types';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: MembershipRole;
  organizationId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

async function resolveUserProfile(supabaseUser: User): Promise<AuthUser | null> {
  // Look up membership to get role + org
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, organization_id')
    .eq('user_id', supabaseUser.id)
    .limit(1)
    .single();

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName:
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      supabaseUser.email ?? '',
    photoURL: supabaseUser.user_metadata?.avatar_url ?? null,
    role: membership?.role ?? 'owner',
    organizationId: membership?.organization_id ?? null,
  };
}

export const useSupabaseAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        resolveUserProfile(session.user).then((profile) => {
          set({ user: profile, loading: false });
        });
      } else {
        set({ user: null, loading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          const profile = await resolveUserProfile(session.user);
          set({ user: profile, loading: false, error: null });
        } else {
          set({ user: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) set({ error: error.message });
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      set({ error: error.message });
    } else {
      set({ error: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
```

**Step 2: Commit**

```bash
git add src/store/supabaseAuthStore.ts
git commit -m "feat: add Supabase auth store (parallel to Firebase auth)"
```

---

### Task 6: Sign Up & Login Pages

**Files:**
- Create: `src/pages/SignUp.tsx`
- Create: `src/pages/NewLogin.tsx`

**Step 1: Create the Sign Up page**

Create `src/pages/SignUp.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export function SignUp() {
  const { signUpWithEmail, signInWithGoogle, error, clearError } = useSupabaseAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    await signUpWithEmail(email, password);
    setSubmitted(true);
  };

  if (submitted && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-sm text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎨</div>
          <h1 className="text-2xl font-bold text-gray-900">Start Your Free Trial</h1>
          <p className="text-sm text-gray-500 mt-1">14 days free, no credit card required</p>
        </div>

        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Confirm your password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Create Account
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign up with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Create the new Login page**

Create `src/pages/NewLogin.tsx` — same structure as existing Login but with email/password + Google, and links to sign-up:

```typescript
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export function NewLogin() {
  const { user, loading, error, signInWithEmail, signInWithGoogle, clearError } = useSupabaseAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(user.organizationId ? '/app' : '/onboarding', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signInWithEmail(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎨</div>
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
          <p className="text-sm text-gray-500 mt-1">Painting Bid Calculator</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <div className="flex justify-between items-start gap-2">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-600 flex-shrink-0 text-lg leading-none">x</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/signup" className="text-primary-600 hover:underline">Start free trial</Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/pages/SignUp.tsx src/pages/NewLogin.tsx
git commit -m "feat: add sign-up and new login pages with email + Google auth"
```

---

### Task 7: Onboarding Page

**Files:**
- Create: `src/pages/Onboarding.tsx`

**Step 1: Create onboarding page**

After sign-up + email verification, user lands here to create their organization.

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createDefaultPricingSettings } from '../core/constants/defaultPricing';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 6);
}

export function Onboarding() {
  const { user } = useSupabaseAuthStore();
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: companyName.trim(), slug: generateSlug(companyName) })
        .select()
        .single();

      if (orgError || !org) throw orgError || new Error('Failed to create organization');

      // 2. Create owner membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({ organization_id: org.id, user_id: user.uid, role: 'owner' });

      if (memberError) throw memberError;

      // 3. Seed default pricing settings
      const defaultPricing = createDefaultPricingSettings();
      const { error: pricingError } = await supabase
        .from('pricing_settings')
        .insert({
          organization_id: org.id,
          settings_json: defaultPricing as unknown as Record<string, unknown>,
        });

      if (pricingError) throw pricingError;

      // 4. Navigate to app
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏗️</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Company</h1>
          <p className="text-sm text-gray-500 mt-1">Just one more step to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your Painting Company"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !companyName.trim()}
            className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat: add onboarding page for company setup"
```

---

## Phase 3: Organization Context & Data Layer

### Task 8: Organization Provider

**Files:**
- Create: `src/context/OrganizationContext.tsx`

**Step 1: Create the organization context**

This wraps the protected app routes and provides tenant context to all components.

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import type { MembershipRole, PlanStatus } from '../types/supabase.types';

interface Organization {
  id: string;
  name: string;
  slug: string;
  planStatus: PlanStatus;
  trialEndsAt: string;
}

interface OrganizationContextValue {
  org: Organization | null;
  role: MembershipRole | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  org: null,
  role: null,
  loading: true,
});

export function useOrganization() {
  return useContext(OrganizationContext);
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseAuthStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrg(null);
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchOrg() {
      const { data: membership } = await supabase
        .from('memberships')
        .select('role, organization_id, organizations(*)')
        .eq('user_id', user!.uid)
        .limit(1)
        .single();

      if (membership?.organizations) {
        const o = membership.organizations as unknown as {
          id: string; name: string; slug: string;
          plan_status: PlanStatus; trial_ends_at: string;
        };
        setOrg({
          id: o.id,
          name: o.name,
          slug: o.slug,
          planStatus: o.plan_status,
          trialEndsAt: o.trial_ends_at,
        });
        setRole(membership.role as MembershipRole);
      }
      setLoading(false);
    }

    fetchOrg();
  }, [user]);

  return (
    <OrganizationContext.Provider value={{ org, role, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add src/context/OrganizationContext.tsx
git commit -m "feat: add OrganizationProvider context for multi-tenancy"
```

---

### Task 9: Supabase Data Services

**Files:**
- Create: `src/services/settingsService.ts`
- Create: `src/services/bidService.ts`

**Step 1: Create settings service**

Thin layer for reading/writing pricing settings to Supabase.

```typescript
import { supabase } from '../config/supabase';
import type { PricingSettings } from '../types/settings.types';

export async function fetchPricingSettings(orgId: string): Promise<PricingSettings | null> {
  const { data, error } = await supabase
    .from('pricing_settings')
    .select('settings_json')
    .eq('organization_id', orgId)
    .single();

  if (error || !data) return null;
  return data.settings_json as unknown as PricingSettings;
}

export async function savePricingSettings(orgId: string, settings: PricingSettings): Promise<void> {
  const { error } = await supabase
    .from('pricing_settings')
    .update({
      settings_json: settings as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);

  if (error) throw error;
}
```

**Step 2: Create bid service**

```typescript
import { supabase } from '../config/supabase';
import type { Bid } from '../types/bid.types';

export async function fetchBids(orgId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    ...(row.bid_data as unknown as Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

export async function saveBid(
  orgId: string,
  userId: string,
  bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      organization_id: orgId,
      created_by: userId,
      calculator_type: bid.calculatorType,
      customer_name: bid.customer.name,
      bid_data: bid as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (error || !data) throw error || new Error('Failed to save bid');
  return data.id;
}

export async function updateBid(bidId: string, updates: Partial<Bid>): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({
      bid_data: updates as unknown as Record<string, unknown>,
      customer_name: updates.customer?.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bidId);

  if (error) throw error;
}

export async function deleteBid(bidId: string): Promise<void> {
  const { error } = await supabase.from('bids').delete().eq('id', bidId);
  if (error) throw error;
}
```

**Step 3: Commit**

```bash
git add src/services/settingsService.ts src/services/bidService.ts
git commit -m "feat: add Supabase data services for settings and bids"
```

---

## Phase 4: Stripe Billing

### Task 10: Stripe Edge Function for Checkout

**Files:**
- Create: `supabase/functions/create-checkout/index.ts`

**Step 1: Create the checkout Edge Function**

This creates a Stripe Checkout Session when a user clicks "Subscribe".

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Get org for this user
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(name, stripe_customer_id)')
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return new Response('Only owners can manage billing', { status: 403 });
    }

    const org = membership.organizations as unknown as { name: string; stripe_customer_id: string | null };

    // Create or reuse Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { organization_id: membership.organization_id },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', membership.organization_id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/app?billing=success`,
      cancel_url: `${req.headers.get('origin')}/app?billing=canceled`,
      subscription_data: {
        trial_period_days: 0, // They already had a trial
        metadata: { organization_id: membership.organization_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/create-checkout/index.ts
git commit -m "feat: add Stripe checkout Edge Function"
```

---

### Task 11: Stripe Webhook Edge Function

**Files:**
- Create: `supabase/functions/stripe-webhook/index.ts`

**Step 1: Create the webhook handler**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Use service role for webhook — not user-scoped
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.subscription
        ? (await stripe.subscriptions.retrieve(session.subscription as string)).metadata.organization_id
        : null;

      if (orgId) {
        await supabase.from('organizations').update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan_status: 'active',
        }).eq('id', orgId);
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          await supabase.from('organizations').update({ plan_status: 'active' }).eq('id', orgId);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          await supabase.from('organizations').update({ plan_status: 'past_due' }).eq('id', orgId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata.organization_id;
      if (orgId) {
        await supabase.from('organizations').update({ plan_status: 'canceled' }).eq('id', orgId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

**Step 2: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: add Stripe webhook Edge Function for subscription lifecycle"
```

---

### Task 12: Billing UI Component

**Files:**
- Create: `src/components/settings/BillingSettings.tsx`
- Create: `src/services/billingService.ts`

**Step 1: Create billing service**

```typescript
import { supabase } from '../config/supabase';

export async function createCheckoutSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    method: 'POST',
  });

  if (error) throw error;
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-portal', {
    method: 'POST',
  });

  if (error) throw error;
  return data.url;
}
```

**Step 2: Create billing settings component**

```typescript
import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { createCheckoutSession, createPortalSession } from '../../services/billingService';

export function BillingSettings() {
  const { org } = useOrganization();
  const [loading, setLoading] = useState(false);

  if (!org) return null;

  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();
  const isActive = org.planStatus === 'active';
  const isPastDue = org.planStatus === 'past_due';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Billing</h3>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Plan Status</span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
            isActive ? 'bg-green-100 text-green-800' :
            isTrialing && !trialExpired ? 'bg-blue-100 text-blue-800' :
            isPastDue ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {isActive ? 'Active' :
             isTrialing && !trialExpired ? 'Free Trial' :
             isPastDue ? 'Past Due' :
             'Inactive'}
          </span>
        </div>

        {isTrialing && !trialExpired && (
          <p className="text-sm text-gray-600 mb-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        {isActive ? (
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Manage Billing'}
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Subscribe — $29/mo'}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/services/billingService.ts src/components/settings/BillingSettings.tsx
git commit -m "feat: add billing settings UI and service"
```

---

## Phase 5: Team Management

### Task 13: Team Settings Component

**Files:**
- Create: `src/components/settings/TeamSettings.tsx`
- Create: `src/services/teamService.ts`

**Step 1: Create team service**

```typescript
import { supabase } from '../config/supabase';
import type { MembershipRole, InvitationRole } from '../types/supabase.types';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: InvitationRole;
  expiresAt: string;
}

export async function fetchTeamMembers(orgId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, user_id, role, created_at')
    .eq('organization_id', orgId);

  if (error) throw error;

  // Get user details from auth (via a join or separate lookup)
  // For now, return with user_id — we'll enhance with profiles later
  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: '', // Will be populated from auth
    displayName: '',
    role: m.role as MembershipRole,
    joinedAt: m.created_at,
  }));
}

export async function fetchPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .is('accepted_at', null);

  if (error) throw error;

  return (data ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as InvitationRole,
    expiresAt: inv.expires_at,
  }));
}

export async function sendInvite(orgId: string, email: string, role: InvitationRole): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .insert({ organization_id: orgId, email, role });

  if (error) throw error;
  // TODO: Trigger invite email via Edge Function
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function updateMemberRole(membershipId: string, role: MembershipRole): Promise<void> {
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) throw error;
}

export async function removeMember(membershipId: string): Promise<void> {
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
  if (error) throw error;
}
```

**Step 2: Create team settings component**

```typescript
import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import {
  fetchTeamMembers,
  fetchPendingInvites,
  sendInvite,
  cancelInvite,
  removeMember,
  type TeamMember,
  type PendingInvite,
} from '../../services/teamService';
import type { InvitationRole } from '../../types/supabase.types';

export function TeamSettings() {
  const { org, role } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitationRole>('estimator');
  const [sending, setSending] = useState(false);

  const canManage = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (!org) return;
    fetchTeamMembers(org.id).then(setMembers);
    fetchPendingInvites(org.id).then(setInvites);
  }, [org]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !email.trim()) return;
    setSending(true);
    try {
      await sendInvite(org.id, email.trim(), inviteRole);
      setEmail('');
      const updated = await fetchPendingInvites(org.id);
      setInvites(updated);
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    await cancelInvite(id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await removeMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>

      {/* Current members */}
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{m.email || m.userId}</p>
              <p className="text-xs text-gray-500 capitalize">{m.role}</p>
            </div>
            {role === 'owner' && m.role !== 'owner' && (
              <button
                onClick={() => handleRemoveMember(m.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h4>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div>
                  <p className="text-sm text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{inv.role} — expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleCancelInvite(inv.id)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={handleInvite} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Invite Team Member</h4>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as InvitationRole)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="estimator">Estimator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/services/teamService.ts src/components/settings/TeamSettings.tsx
git commit -m "feat: add team management settings and invite system"
```

---

### Task 14: Accept Invitation Page

**Files:**
- Create: `src/pages/AcceptInvite.tsx`

**Step 1: Create the accept invite page**

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useSupabaseAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'login-required'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus('login-required');
      return;
    }

    async function acceptInvite() {
      setStatus('accepting');

      // 1. Look up invitation by token
      const { data: invite, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (invError || !invite) {
        setError('Invitation not found or already used.');
        setStatus('error');
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired.');
        setStatus('error');
        return;
      }

      // 2. Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          organization_id: invite.organization_id,
          user_id: user!.uid,
          role: invite.role,
        });

      if (memberError) {
        setError(memberError.message);
        setStatus('error');
        return;
      }

      // 3. Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      navigate('/app', { replace: true });
    }

    acceptInvite();
  }, [user, authLoading, token, navigate]);

  if (status === 'login-required') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">📨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-sm text-gray-600 mb-4">Sign in or create an account to join the team.</p>
          <a href={`/login?redirect=/invite/${token}`} className="block w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors text-center">
            Sign In
          </a>
          <a href={`/signup?redirect=/invite/${token}`} className="block mt-2 text-sm text-primary-600 hover:underline">
            Create Account
          </a>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-3">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🎨</div>
        <p className="text-gray-500 text-sm">Joining team...</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/AcceptInvite.tsx
git commit -m "feat: add invitation acceptance page"
```

---

## Phase 6: Landing Page

### Task 15: Build Landing Page with /frontend-design

**Files:**
- Create: `src/pages/Landing.tsx`

**Step 1: Use `/frontend-design` skill**

Invoke the `frontend-design` skill to design and build the landing page with these sections:

1. **Hero** — "Accurate Painting Bids in Minutes" headline, subheadline, CTA
2. **Features grid** — 4 cards (5 calculators, custom pricing, PDF export, team accounts)
3. **How it works** — 3-step visual flow
4. **Pricing** — Single card: $29/mo, feature list, "Start 14-Day Free Trial" button
5. **Footer** — basic links

Use existing Tailwind config and `primary-*` color palette. Professional, clean aesthetic targeting painting contractors.

**Step 2: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: add marketing landing page"
```

---

## Phase 7: Subscription Gating

### Task 16: Subscription Guard Component

**Files:**
- Create: `src/components/auth/SubscriptionGate.tsx`

**Step 1: Create the subscription gate**

This component checks plan status and blocks access when expired/canceled.

```typescript
import { Navigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { org, loading } = useOrganization();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🎨</div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!org) return <Navigate to="/onboarding" replace />;

  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();

  if (org.planStatus === 'canceled' || trialExpired) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add src/components/auth/SubscriptionGate.tsx
git commit -m "feat: add subscription gate for plan enforcement"
```

---

### Task 17: Subscribe Page (Expired Trial / Canceled)

**Files:**
- Create: `src/pages/Subscribe.tsx`

**Step 1: Create the subscribe page**

Shown when trial has expired or subscription is canceled.

```typescript
import { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createCheckoutSession } from '../services/billingService';

export function Subscribe() {
  const { org } = useOrganization();
  const { signOut } = useSupabaseAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to Continue</h1>
        <p className="text-sm text-gray-600 mb-6">
          {org?.planStatus === 'canceled'
            ? 'Your subscription has ended. Resubscribe to access your bids and calculators.'
            : 'Your free trial has ended. Subscribe to keep using the Bid Calculator.'}
        </p>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
          <p className="text-2xl font-bold text-primary-700">$29<span className="text-sm font-normal">/month</span></p>
          <ul className="mt-3 text-sm text-primary-800 space-y-1 text-left">
            <li>- 5 calculator types</li>
            <li>- Custom pricing & settings</li>
            <li>- PDF export</li>
            <li>- Team accounts</li>
            <li>- Unlimited bids</li>
          </ul>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Subscribe Now'}
        </button>

        <button
          onClick={signOut}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/Subscribe.tsx
git commit -m "feat: add subscribe page for expired trials"
```

---

## Phase 8: Router & App Shell Integration

### Task 18: Update App Router

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update the router**

Restructure the router to support public routes, auth routes, onboarding, and the protected app shell. The existing calculator routes stay exactly as they are, just nested under `/app`.

```typescript
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SubscriptionGate } from './components/auth/SubscriptionGate';
import { OrganizationProvider } from './context/OrganizationContext';
import { Home } from './pages/Home';
import { SavedBids } from './pages/SavedBids';
import { Settings } from './pages/Settings';
import { CalculatorPage } from './pages/CalculatorPage';
import { Landing } from './pages/Landing';
import { NewLogin } from './pages/NewLogin';
import { SignUp } from './pages/SignUp';
import { Onboarding } from './pages/Onboarding';
import { Subscribe } from './pages/Subscribe';
import { AcceptInvite } from './pages/AcceptInvite';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';

function AppShell() {
  return (
    <OrganizationProvider>
      <SubscriptionGate>
        <Layout>
          <Outlet />
        </Layout>
      </SubscriptionGate>
    </OrganizationProvider>
  );
}

function App() {
  const initialize = useSupabaseAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<NewLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        {/* Auth required but no org needed */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/subscribe" element={<Subscribe />} />

          {/* Full app — auth + org + active subscription */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="calculator/:type" element={<CalculatorPage />} />
            <Route path="saved-bids" element={<SavedBids />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 2: Update internal navigation links**

Update `Home.tsx` calculator links from `/calculator/:type` to `/app/calculator/:type`. Update `Layout.tsx` nav links from `/` to `/app`, `/saved-bids` to `/app/saved-bids`, `/settings` to `/app/settings`. Update `Login.tsx` redirect from `/` to `/app`.

**Step 3: Verify the app builds**

Run: `npm run build`
Expected: No TypeScript errors, successful build.

**Step 4: Commit**

```bash
git add src/App.tsx src/pages/Home.tsx src/components/common/Layout.tsx
git commit -m "feat: restructure router for SaaS (public + auth + app routes)"
```

---

## Phase 9: Firebase → Supabase Store Swap

### Task 19: Swap Auth Store

**Files:**
- Modify: `src/store/authStore.ts`

**Step 1: Re-export Supabase auth as the main auth store**

Replace `src/store/authStore.ts` contents to re-export from Supabase store. This means every existing import of `useAuthStore` now uses Supabase without changing any component imports.

```typescript
// Re-export Supabase auth store as the canonical auth store
export { useSupabaseAuthStore as useAuthStore } from './supabaseAuthStore';
export type { AuthUser } from './supabaseAuthStore';
```

**Step 2: Verify the app builds**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/store/authStore.ts
git commit -m "feat: swap auth store from Firebase to Supabase"
```

---

### Task 20: Update Settings Store to Sync with Supabase

**Files:**
- Modify: `src/store/settingsStore.ts`

**Step 1: Add Supabase sync to the settings store**

Add methods to load settings from Supabase and save changes back. Keep localStorage as a cache for offline/fast access. The store interface stays the same — `updatePricing`, `addLineItem`, etc. all still work. We add `loadFromSupabase(orgId)` and modify the save methods to also write to Supabase.

This is a targeted modification: add an `orgId` field, a `loadFromSupabase` method, and wrap existing mutation methods with a Supabase write-through.

**Step 2: Verify existing calculator behavior is unchanged**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/store/settingsStore.ts
git commit -m "feat: add Supabase sync to settings store"
```

---

### Task 21: Update Bid Store to Sync with Supabase

**Files:**
- Modify: `src/store/bidStore.ts`

**Step 1: Add Supabase sync to the bid store**

Same pattern as settings: add `orgId` field, `loadFromSupabase(orgId)` method, and modify `saveBid`/`updateBid`/`deleteBid` to write through to Supabase. Keep the same store interface.

**Step 2: Verify the app builds**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/store/bidStore.ts
git commit -m "feat: add Supabase sync to bid store"
```

---

### Task 22: Remove Firebase

**Files:**
- Delete: `src/config/firebase.ts`
- Modify: `package.json` (remove `firebase` dependency)

**Step 1: Delete Firebase config**

Remove `src/config/firebase.ts`.

**Step 2: Remove Firebase package**

Run: `npm uninstall firebase`

**Step 3: Search for any remaining Firebase imports**

Run: `grep -r "firebase" src/ --include="*.ts" --include="*.tsx"`

Remove or replace any remaining references.

**Step 4: Verify the app builds**

Run: `npm run build`

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Firebase dependency, fully migrated to Supabase"
```

---

## Phase 10: Data Migration Script

### Task 23: Firebase → Supabase Migration Script

**Files:**
- Create: `scripts/migrate-firebase-to-supabase.ts`

**Step 1: Create migration script**

A one-time script that reads existing Firestore data (users, settings, bids) and writes them to Supabase. Creates the texpainting.com org as the first tenant.

This is run manually during the cutover. Include clear instructions in the script comments.

**Step 2: Commit**

```bash
git add scripts/migrate-firebase-to-supabase.ts
git commit -m "feat: add Firebase to Supabase data migration script"
```

---

## Phase 11: Past-Due Banner & Polish

### Task 24: Past-Due Warning Banner

**Files:**
- Create: `src/components/common/PastDueBanner.tsx`
- Modify: `src/components/common/Layout.tsx`

**Step 1: Create the banner**

A yellow warning banner shown when `plan_status === 'past_due'`.

**Step 2: Add to Layout**

Render at the top of Layout when org status is past_due.

**Step 3: Commit**

```bash
git add src/components/common/PastDueBanner.tsx src/components/common/Layout.tsx
git commit -m "feat: add past-due payment warning banner"
```

---

### Task 25: Add Billing & Team Tabs to Settings Page

**Files:**
- Modify: `src/pages/Settings.tsx`

**Step 1: Add new tabs**

Add "Team" tab (visible to owner/admin) and "Billing" tab (visible to owner only) to the existing tabbed settings interface. Import and render `TeamSettings` and `BillingSettings` components.

**Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add Team and Billing tabs to Settings page"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Supabase setup, schema, RLS, types |
| 2 | 5-7 | Auth store, sign-up/login pages, onboarding |
| 3 | 8-9 | Organization context, data services |
| 4 | 10-12 | Stripe checkout, webhooks, billing UI |
| 5 | 13-14 | Team management, invite system |
| 6 | 15 | Landing page (use /frontend-design) |
| 7 | 16-17 | Subscription gating |
| 8 | 18 | Router restructure |
| 9 | 19-22 | Firebase → Supabase store swap |
| 10 | 23 | Data migration script |
| 11 | 24-25 | Polish (past-due banner, settings tabs) |
