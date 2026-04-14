# Two-Tier Pricing & Feature Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single $29/mo plan into Basic ($29) and Pro ($49), gate quote features behind Pro, and grandfather existing customers.

**Architecture:** Add `plan_tier` column to organizations, create two Stripe prices, update edge functions to accept tier parameter, gate UI features with upgrade nudges, redesign Subscribe page as a two-card comparison.

**Tech Stack:** React, TypeScript, Supabase (Postgres + Edge Functions), Stripe API, Tailwind CSS

---

### Task 1: Database Migration — Add plan_tier Column

**Files:**
- Create: `supabase/migrations/006_add_plan_tier.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/006_add_plan_tier.sql`:

```sql
-- Add plan_tier column to organizations
ALTER TABLE organizations ADD COLUMN plan_tier text NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro'));

-- Grandfather existing active/trialing customers to Pro
UPDATE organizations SET plan_tier = 'pro' WHERE plan_status IN ('active', 'trialing');
```

- [ ] **Step 2: Run the migration against Supabase**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase db push --project-ref hbranokmkritcdzozjli
```

If `db push` is not available, run the SQL directly via the Supabase SQL Editor in the dashboard at `https://supabase.com/dashboard/project/hbranokmkritcdzozjli/sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_add_plan_tier.sql
git commit -m "feat: add plan_tier column to organizations table"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/supabase.types.ts:1` (add PlanTier type)
- Modify: `src/types/supabase.types.ts:9-39` (add plan_tier to organizations Row/Insert/Update)

- [ ] **Step 1: Add PlanTier type**

In `src/types/supabase.types.ts`, add after line 1 (`export type PlanStatus = ...`):

```typescript
export type PlanTier = 'basic' | 'pro';
```

- [ ] **Step 2: Add plan_tier to organizations Row**

In the organizations `Row` type (around line 10-19), add after `plan_status: PlanStatus;`:

```typescript
plan_tier: PlanTier;
```

- [ ] **Step 3: Add plan_tier to organizations Insert**

In the organizations `Insert` type (around line 20-29), add after `plan_status?: PlanStatus;`:

```typescript
plan_tier?: PlanTier;
```

- [ ] **Step 4: Add plan_tier to organizations Update**

In the organizations `Update` type (around line 30-39), add after `plan_status?: PlanStatus;`:

```typescript
plan_tier?: PlanTier;
```

- [ ] **Step 5: Add plan_tier to Enums**

In the `Enums` section (around line 300-305), add after `plan_status: PlanStatus;`:

```typescript
plan_tier: PlanTier;
```

- [ ] **Step 6: Commit**

```bash
git add src/types/supabase.types.ts
git commit -m "feat: add PlanTier type to supabase types"
```

---

### Task 3: Update OrganizationContext to Expose planTier

**Files:**
- Modify: `src/context/OrganizationContext.tsx:6` (import PlanTier)
- Modify: `src/context/OrganizationContext.tsx:8-14` (Organization interface)
- Modify: `src/context/OrganizationContext.tsx:16-20` (context value interface)
- Modify: `src/context/OrganizationContext.tsx:54-65` (org loading)

- [ ] **Step 1: Add PlanTier import**

In `src/context/OrganizationContext.tsx` line 6, change:

```typescript
import type { MembershipRole, PlanStatus } from '../types/supabase.types';
```

To:

```typescript
import type { MembershipRole, PlanStatus, PlanTier } from '../types/supabase.types';
```

- [ ] **Step 2: Add planTier to Organization interface**

Change the `Organization` interface (lines 8-14):

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  planStatus: PlanStatus;
  planTier: PlanTier;
  trialEndsAt: string;
}
```

- [ ] **Step 3: Add isProTier to context value**

Change the `OrganizationContextValue` interface (lines 16-20):

```typescript
interface OrganizationContextValue {
  org: Organization | null;
  role: MembershipRole | null;
  loading: boolean;
  isProTier: boolean;
}
```

Update the default context value (lines 22-26):

```typescript
const OrganizationContext = createContext<OrganizationContextValue>({
  org: null,
  role: null,
  loading: true,
  isProTier: false,
});
```

- [ ] **Step 4: Load plan_tier from database**

In the `fetchOrg` function, update the type cast (around line 55-56):

```typescript
const o = membership.organizations as unknown as {
  id: string; name: string; slug: string;
  plan_status: PlanStatus; plan_tier: PlanTier; trial_ends_at: string;
};
```

Update the `setOrg` call (around lines 59-65):

```typescript
setOrg({
  id: o.id,
  name: o.name,
  slug: o.slug,
  planStatus: o.plan_status,
  planTier: o.plan_tier ?? 'basic',
  trialEndsAt: o.trial_ends_at,
});
```

- [ ] **Step 5: Compute and expose isProTier**

In the `OrganizationProvider` return, compute `isProTier` and pass it:

```typescript
const isProTier = org?.planTier === 'pro' || org?.planStatus === 'trialing';

return (
  <OrganizationContext.Provider value={{ org, role, loading, isProTier }}>
    {children}
  </OrganizationContext.Provider>
);
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors (other files don't destructure `isProTier` yet so no breakage)

- [ ] **Step 7: Commit**

```bash
git add src/context/OrganizationContext.tsx
git commit -m "feat: expose planTier and isProTier from OrganizationContext"
```

---

### Task 4: Update billingService to Accept Tier

**Files:**
- Modify: `src/services/billingService.ts`

- [ ] **Step 1: Update createCheckoutSession**

Replace the entire file `src/services/billingService.ts`:

```typescript
import { supabase } from '../config/supabase';
import type { PlanTier } from '../types/supabase.types';

export async function createCheckoutSession(tier: PlanTier = 'basic'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { tier },
  });

  if (error) throw error;
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-portal');

  if (error) throw error;
  return data.url;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/billingService.ts
git commit -m "feat: add tier parameter to createCheckoutSession"
```

---

### Task 5: Update create-checkout Edge Function

**Files:**
- Modify: `supabase/functions/create-checkout/index.ts`

- [ ] **Step 1: Replace the edge function**

Replace the entire file `supabase/functions/create-checkout/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

const PRICE_IDS: Record<string, string> = {
  basic: Deno.env.get('STRIPE_PRICE_ID_BASIC')!,
  pro: Deno.env.get('STRIPE_PRICE_ID_PRO')!,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tier = 'basic' } = await req.json().catch(() => ({}));

    if (tier !== 'basic' && tier !== 'pro') {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = PRICE_IDS[tier];

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(name, stripe_customer_id)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return new Response('Only owners can manage billing', { status: 403 });
    }

    const org = membership.organizations as unknown as { name: string; stripe_customer_id: string | null };

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/app?billing=success`,
      cancel_url: `${req.headers.get('origin')}/app?billing=canceled`,
      subscription_data: {
        metadata: { organization_id: membership.organization_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy the edge function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase functions deploy create-checkout --no-verify-jwt --project-ref hbranokmkritcdzozjli
```

**Important:** After deploying, set the two new env vars in Supabase dashboard (Settings > Edge Functions > Secrets):
- `STRIPE_PRICE_ID_BASIC` = the $29/mo price ID from Stripe
- `STRIPE_PRICE_ID_PRO` = the $49/mo price ID from Stripe

The old `STRIPE_PRICE_ID` env var can be left in place — it's no longer referenced.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/create-checkout/index.ts
git commit -m "feat: update create-checkout to accept tier parameter"
```

---

### Task 6: Update stripe-webhook Edge Function

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Replace the webhook handler**

Replace the entire file `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map Stripe price IDs to plan tiers
const PRICE_TO_TIER: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_ID_BASIC') ?? '']: 'basic',
  [Deno.env.get('STRIPE_PRICE_ID_PRO') ?? '']: 'pro',
};

function getTierFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  return PRICE_TO_TIER[priceId] ?? 'basic';
}

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
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          await supabase.from('organizations').update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_status: 'active',
            plan_tier: getTierFromSubscription(sub),
          }).eq('id', orgId);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata.organization_id;
      if (orgId) {
        await supabase.from('organizations').update({
          plan_tier: getTierFromSubscription(sub),
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

Key changes from the original:
- Added `PRICE_TO_TIER` mapping and `getTierFromSubscription` helper
- `checkout.session.completed` now also writes `plan_tier`
- Added `customer.subscription.updated` handler for plan switches via Stripe Portal

- [ ] **Step 2: Register the new webhook event in Stripe**

In the Stripe Dashboard (Developers > Webhooks), edit the existing webhook endpoint and add the `customer.subscription.updated` event to the list of events to listen for.

- [ ] **Step 3: Deploy the edge function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase functions deploy stripe-webhook --no-verify-jwt --project-ref hbranokmkritcdzozjli
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: update stripe webhook to handle plan_tier and subscription updates"
```

---

### Task 7: Create UpgradeNudge Component

**Files:**
- Create: `src/components/common/UpgradeNudge.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/common/UpgradeNudge.tsx`:

```tsx
import { useState } from 'react';
import { createCheckoutSession } from '../../services/billingService';

interface UpgradeNudgeProps {
  feature: string;
}

export function UpgradeNudge({ feature }: UpgradeNudgeProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession('pro');
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="bg-navy/5 border border-navy/10 rounded-lg p-6 text-center">
      <div className="text-2xl mb-2">&#x2728;</div>
      <h3 className="font-display text-lg font-700 text-navy mb-1">Pro Feature</h3>
      <p className="text-sm text-gray-600 mb-4">
        {feature} is available on the Pro plan.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="font-display font-700 uppercase tracking-wide bg-gold text-navy py-2 px-6 text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Upgrade to Pro — $49/mo'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/UpgradeNudge.tsx
git commit -m "feat: add UpgradeNudge component for Pro feature gating"
```

---

### Task 8: Gate Features in SavedBids

**Files:**
- Modify: `src/pages/SavedBids.tsx:4` (add import)
- Modify: `src/pages/SavedBids.tsx:31-33` (get isProTier)
- Modify: `src/pages/SavedBids.tsx:290-299` (gate Send button)

- [ ] **Step 1: Add imports and get tier**

In `src/pages/SavedBids.tsx`, add import for `useOrganization` (it's already imported via `useAuthStore`, but we need the org context):

After the existing imports (around line 10), add:

```typescript
import { useOrganization } from '../context/OrganizationContext';
import { UpgradeNudge } from '../components/common/UpgradeNudge';
```

Inside the `SavedBids` component, after the existing state declarations (around line 45), add:

```typescript
const { isProTier } = useOrganization();
```

- [ ] **Step 2: Gate the Send button**

Find the Send button ternary (around line 290). Wrap the `!quoteMap.has(bid.id) ?` branch to also check `isProTier`:

Change:

```tsx
{!quoteMap.has(bid.id) ? (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setSendModalBid({ id: bid.id, name: bid.customerName, email: '' });
    }}
    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
  >
    Send
  </button>
) : (
```

To:

```tsx
{!quoteMap.has(bid.id) ? (
  isProTier ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSendModalBid({ id: bid.id, name: bid.customerName, email: '' });
      }}
      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      Send
    </button>
  ) : (
    <span className="text-sm text-gray-400 cursor-default" title="Upgrade to Pro to send quotes">
      Send &#x1f512;
    </span>
  )
) : (
```

- [ ] **Step 3: Add upgrade nudge modal for Basic users clicking Send**

Actually, the lock icon with title tooltip is sufficient for the inline button. For a better UX, also add a modal state. After the `sentQuoteUrl` state, add:

```typescript
const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
```

Change the Basic user's Send span to a button that opens the nudge:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    setShowUpgradeNudge(true);
  }}
  className="text-sm text-gray-400 hover:text-gray-500 font-medium"
>
  Send &#x1f512;
</button>
```

After the `QuoteSentModal` render block (around line 370), add:

```tsx
{showUpgradeNudge && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
      <UpgradeNudge feature="Emailing quotes to customers" />
      <button
        onClick={() => setShowUpgradeNudge(false)}
        className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
      >
        Maybe later
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat: gate Send Quote behind Pro tier with upgrade nudge"
```

---

### Task 9: Gate Presentation Tab in Settings

**Files:**
- Modify: `src/pages/Settings.tsx:14` (add import)
- Modify: `src/pages/Settings.tsx:32-33` (get isProTier)
- Modify: `src/pages/Settings.tsx:48-53` (gate tab)
- Modify: `src/pages/Settings.tsx:122` (gate content)

- [ ] **Step 1: Add imports and get tier**

In `src/pages/Settings.tsx`, add after the existing imports (line 14):

```typescript
import { UpgradeNudge } from '../components/common/UpgradeNudge';
```

Inside the `Settings` component, after `const isOwner = role === 'owner';` (line 33), add:

```typescript
const { isProTier } = useOrganization();
```

(Note: `useOrganization` is already imported on line 14.)

- [ ] **Step 2: Add visual indicator on Presentation tab**

Change the Presentation tab button (lines 48-53) to show a lock for Basic users:

```tsx
<TabButton
  active={activeTab === 'presentation'}
  onClick={() => setActiveTab('presentation')}
>
  Presentation {!isProTier && '\u{1f512}'}
</TabButton>
```

- [ ] **Step 3: Gate Presentation content**

Change the Presentation content render (line 122):

```tsx
{activeTab === 'presentation' && (
  isProTier ? <PresentationSettings /> : <UpgradeNudge feature="The Presentation Builder" />
)}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: gate Presentation settings behind Pro tier"
```

---

### Task 10: Redesign Subscribe Page with Two Tiers

**Files:**
- Modify: `src/pages/Subscribe.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the Subscribe page**

Replace the entire file `src/pages/Subscribe.tsx`:

```tsx
import { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { createCheckoutSession } from '../services/billingService';
import type { PlanTier } from '../types/supabase.types';

const PLANS = [
  {
    tier: 'basic' as PlanTier,
    name: 'Basic',
    price: 29,
    features: [
      '5 Calculator Types',
      'Custom Pricing & Settings',
      'PDF Export',
      'Team Accounts',
      'Unlimited Bids',
    ],
  },
  {
    tier: 'pro' as PlanTier,
    name: 'Pro',
    price: 49,
    features: [
      'Everything in Basic',
      'Email Quotes to Customers',
      'Public Quote Pages',
      'Presentation Builder',
      'Quote Tracking & Activity',
      'Customer Payments (coming soon)',
    ],
    recommended: true,
  },
];

export function Subscribe() {
  const { org } = useOrganization();
  const { signOut } = useSupabaseAuthStore();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const handleSubscribe = async (tier: PlanTier) => {
    setLoadingTier(tier);
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-14 mx-auto mb-2" />
      <h1 className="font-display text-2xl font-800 uppercase tracking-wide text-navy mb-2">
        Choose Your Plan
      </h1>
      <p className="text-sm text-gray-600 mb-8 text-center max-w-md">
        {org?.planStatus === 'canceled'
          ? 'Your subscription has ended. Pick a plan to get back to work.'
          : 'Your free trial has ended. Pick a plan to keep using CoatCalc.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`flex-1 bg-white shadow-lg p-6 relative ${
              plan.recommended ? 'ring-2 ring-gold' : ''
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-display font-700 uppercase tracking-wide px-3 py-1">
                Recommended
              </div>
            )}
            <h2 className="font-display text-xl font-800 uppercase tracking-wide text-navy mb-1">
              {plan.name}
            </h2>
            <p className="text-3xl font-display font-900 text-navy mb-4">
              ${plan.price}<span className="text-sm font-normal text-gray-400">/month</span>
            </p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-teal-500 mt-0.5">&#x2713;</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.tier)}
              disabled={loadingTier !== null}
              className={`w-full font-display font-700 uppercase tracking-wide py-3 px-4 transition-colors disabled:opacity-50 ${
                plan.recommended
                  ? 'bg-gold text-navy hover:bg-gold-light'
                  : 'bg-navy text-white hover:bg-navy/90'
              }`}
            >
              {loadingTier === plan.tier ? 'Loading...' : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={signOut}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Subscribe.tsx
git commit -m "feat: redesign Subscribe page with Basic and Pro plan cards"
```

---

### Task 11: Update BillingSettings for Two Tiers

**Files:**
- Modify: `src/components/settings/BillingSettings.tsx`

- [ ] **Step 1: Rewrite BillingSettings**

Replace the entire file `src/components/settings/BillingSettings.tsx`:

```tsx
import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { createCheckoutSession, createPortalSession } from '../../services/billingService';

export function BillingSettings() {
  const { org, isProTier } = useOrganization();
  const [loading, setLoading] = useState(false);

  if (!org) return null;

  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();
  const isActive = org.planStatus === 'active';
  const isPastDue = org.planStatus === 'past_due';

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const url = await createCheckoutSession('pro');
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
          <span className="text-sm font-medium text-gray-700">Plan</span>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-sm font-semibold px-2 py-0.5 rounded bg-navy/10 text-navy">
                {org.planTier === 'pro' ? 'Pro' : 'Basic'} — ${org.planTier === 'pro' ? '49' : '29'}/mo
              </span>
            )}
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
        </div>

        {isTrialing && !trialExpired && (
          <p className="text-sm text-gray-600 mb-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        <div className="flex gap-2">
          {isActive ? (
            <>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Manage Billing'}
              </button>
              {org.planTier === 'basic' && (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex-1 bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                setLoading(true);
                window.location.href = '/subscribe';
              }}
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Choose a Plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/BillingSettings.tsx
git commit -m "feat: update BillingSettings to show plan tier and upgrade option"
```

---

### Task 12: Build Verification & Push

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: successful build

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Auto-deploys to www.coatcalc.com via DigitalOcean.

**Manual steps needed after deploy:**
1. Create two Stripe Prices in the Stripe Dashboard ($29/mo Basic, $49/mo Pro) on the existing CoatCalc product
2. Set `STRIPE_PRICE_ID_BASIC` and `STRIPE_PRICE_ID_PRO` secrets on Supabase edge functions
3. Add `customer.subscription.updated` event to the Stripe webhook endpoint
4. Run the migration SQL (Task 1)
5. Deploy both edge functions (Tasks 5 and 6)
