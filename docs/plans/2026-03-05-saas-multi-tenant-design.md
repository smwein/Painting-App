# SaaS Multi-Tenant Design

## Overview
Transform the single-tenant painting bid calculator into a multi-tenant SaaS product. Any painting company can sign up, configure their own pricing, manage a team, and create bids.

## Tech Stack
- **Frontend**: Existing React + Vite + Tailwind + Zustand (unchanged)
- **Backend**: Supabase (Auth, Postgres, Edge Functions) — replaces Firebase
- **Payments**: Stripe ($29/mo, 14-day free trial)
- **Hosting**: Existing setup (Vite build, static hosting)

## Pricing Model
- $29/mo paid subscription
- 14-day free trial, no credit card required
- Full access during trial
- Single plan (no tiers initially)

## Data Model

### organizations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text | "Tex Painting", "ABC Painters" |
| slug | text, unique | For URLs if needed |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan_status | enum | trialing, active, past_due, canceled |
| trial_ends_at | timestamptz | |
| created_at | timestamptz | |

### memberships
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| organization_id | FK → organizations | |
| user_id | FK → auth.users | |
| role | enum | owner, admin, estimator |
| invited_by | FK → auth.users, nullable | |
| created_at | timestamptz | |
| UNIQUE | (organization_id, user_id) | |

### pricing_settings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| organization_id | FK → organizations, unique | |
| settings_json | jsonb | Existing PricingSettings structure |
| updated_at | timestamptz | |

### bids
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| organization_id | FK → organizations | |
| created_by | FK → auth.users | |
| calculator_type | text | |
| customer_name | text | |
| bid_data | jsonb | Calculator inputs/results |
| status | enum | draft, sent, accepted, declined |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### invitations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| organization_id | FK → organizations | |
| email | text | |
| role | enum | admin, estimator |
| token | text, unique | |
| expires_at | timestamptz | |
| accepted_at | timestamptz, nullable | |

### Row Level Security
All tables use RLS with `organization_id`. Users can only access data for organizations they belong to via the `memberships` table.

## Auth & Onboarding

### Sign-up methods
- Email/password
- Google OAuth
- No domain restriction (open to any painting company)

### Sign-up flow
1. Landing page → "Start Free Trial"
2. Sign-up form (name, email, password) or Google sign-in
3. Email verification (Supabase automatic)
4. Onboarding screen: enter company name
5. Creates organization + owner membership + default pricing settings
6. Redirect to app, trial starts

### Login flow
1. Email/password or Google
2. Resolve user → lookup memberships → set active org
3. Multi-org picker if needed (future)

### Invite flow
1. Owner/admin → Settings → Team → "Invite Member"
2. Enter email + role (admin or estimator)
3. Creates invitation row, sends email with link
4. Invitee signs up or logs in → auto-joined to org

## Billing (Stripe)

### Flow
1. Trial starts on org creation (14 days, no card required)
2. User clicks "Subscribe" → Stripe Checkout Session → hosted payment page
3. Stripe webhooks → Supabase Edge Function updates plan_status
4. "Manage Billing" → Stripe Customer Portal (update card, cancel, etc.)

### Webhook events handled
- `checkout.session.completed` → save Stripe IDs, set active
- `invoice.paid` → keep active
- `invoice.payment_failed` → set past_due
- `customer.subscription.deleted` → set canceled

### Access gating
- trialing + not expired → full access
- active → full access
- past_due → warning banner, grace period
- canceled / trial expired → "Subscribe to continue" page, read-only bid access

## Landing Page
Single page in the React app at `/` for unauthenticated users.

### Sections
1. Hero — headline, subheadline, CTA
2. Features grid — 3-4 cards (calculators, custom pricing, PDF export, team accounts)
3. How it works — 3-step visual
4. Pricing — single card, $29/mo, trial CTA
5. Footer — contact, terms, privacy

### Design
- Built with existing Tailwind setup
- Use /frontend-design skill for implementation
- Professional, clean aesthetic

## Routing
- `/` — Landing page (public) or redirect to `/app` if logged in
- `/login` — Sign in
- `/signup` — Sign up
- `/onboarding` — Company setup (post-signup)
- `/app/*` — Protected app routes (calculators, settings, saved bids)
- `/app/settings/team` — Team management
- `/app/settings/billing` — Billing (owner only)
- `/invite/:token` — Accept invitation

## App Shell & Tenant Context

### OrganizationProvider
- React context wrapping protected routes
- Provides currentOrg, currentRole, members
- All stores use currentOrg.id for data isolation

### Settings sync
- Fetch pricing_settings from Supabase on load
- Write to localStorage (cache) + Supabase (source of truth)
- All team members share org's pricing settings

### Bids sync
- Save to Supabase with organization_id + created_by
- All team members see org's bids
- Estimators can only edit their own; owner/admin can edit all

### Role-based UI
- owner: billing, team management, settings, calculators, all bids
- admin: team management, settings, calculators, all bids
- estimator: calculators, own bids only

## Migration Strategy (Firebase → Supabase)

### Phase 1 — Build alongside Firebase
- Set up Supabase project
- Build new code: landing page, onboarding, Stripe, org context, invites
- Firebase continues working

### Phase 2 — Swap auth
- Replace useAuthStore internals (same interface)
- Migrate texpainting.com as first org

### Phase 3 — Swap data
- Migrate Firestore bids + settings → Supabase (one-time script)
- Replace store persistence layers

### Phase 4 — Remove Firebase
- Delete firebase config and imports
- Remove firebase package
- Existing company becomes a regular tenant

## Constraint: Preserve Existing Code
- All calculator components — untouched
- All calculation logic — untouched
- Settings UI components — untouched (gated by role)
- PDF export — untouched
- Store interfaces stay the same, only backend calls change inside them
