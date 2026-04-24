# Cancellation Retention Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic Stripe-Billing-Portal cancel path with an in-app retention flow that (1) captures the cancellation reason, (2) offers a Pro→Basic downgrade to Pro owners and a 50%-off-2-months coupon to Basic owners, and (3) confirms cancel-at-period-end.

**Architecture:** Owner-only. A new `cancel-subscription` edge function owns all cancel-path Stripe mutations (`downgrade`, `accept_offer`, `cancel`, `resume`). A new `CancellationModal` component drives a 3-step state machine (reason → offer → confirm) in `BillingSettings`. One new DB table (`cancellation_events`) + two new columns on `organizations` (`retention_offer_used_at`, `cancel_at_period_end`). The webhook gains one field in its `customer.subscription.updated` handler. Stripe Billing Portal stays available for invoices/card updates.

**Tech Stack:** React + TypeScript + Tailwind, Supabase (Postgres + Auth + Edge Functions on Deno), Stripe Node SDK 14.

**Spec:** `docs/superpowers/specs/2026-04-24-cancellation-retention-design.md`

**Project conventions observed:**
- No unit test suite. Gate on `npm run build` (tsc -b) + manual verification.
- Edge functions hardcode CORS origin to `https://www.coatcalc.com` via inline `corsHeaders` object.
- Edge function deploys: `SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 supabase functions deploy <name> --no-verify-jwt --project-ref hbranokmkritcdzozjli`
- Migrations run manually against the live DB.
- Auto-push to GitHub after each logical commit (per CLAUDE.md memory).

---

## File Structure

**Create:**
- `supabase/migrations/008_retention.sql` — two new columns on `organizations`, new `cancellation_events` table, RLS policy.
- `supabase/functions/cancel-subscription/index.ts` — edge function handling all four cancel-path actions.
- `src/services/cancellationService.ts` — typed client wrapping the edge function.
- `src/components/settings/CancellationModal.tsx` — modal with reason/offer/confirm/resume steps.

**Modify:**
- `src/types/supabase.types.ts` — add new columns to `organizations` row/insert/update types; add `cancellation_events` table types; export `CancellationReason` and `CancellationOutcome` unions.
- `src/context/OrganizationContext.tsx` — extend `Organization` interface + mapping with `retentionOfferUsedAt` and `cancelAtPeriodEnd`.
- `supabase/functions/stripe-webhook/index.ts` — extend `customer.subscription.updated` handler to also write `cancel_at_period_end`.
- `src/components/settings/BillingSettings.tsx` — add "Cancel subscription" button, render `CancellationModal`, render "Scheduled to end on {date}" state when `cancelAtPeriodEnd === true`.

**Stripe Dashboard (manual, one-time, not a code task):**
- Create a live-mode coupon: ID `RETENTION_50_OFF_2MO`, 50% off, duration `repeating`, 2 months.
- Set Supabase secret `STRIPE_RETENTION_COUPON_ID=RETENTION_50_OFF_2MO`.

---

## Task 1: DB migration — columns + cancellation_events table

**Files:**
- Create: `supabase/migrations/008_retention.sql`

- [ ] **Step 1: Write migration SQL**

```sql
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
```

- [ ] **Step 2: Apply migration to Supabase**

Open Supabase SQL editor (project `hbranokmkritcdzozjli`) → paste the SQL from Step 1 → Run.

Expected output: "Success. No rows returned."

- [ ] **Step 3: Verify columns and table exist**

In the Supabase SQL editor, run:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('retention_offer_used_at', 'cancel_at_period_end');

SELECT table_name FROM information_schema.tables WHERE table_name = 'cancellation_events';
```

Expected: both columns listed (`retention_offer_used_at` nullable timestamptz, `cancel_at_period_end` non-null boolean default false); `cancellation_events` row returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_retention.sql
git commit -m "feat: add retention_offer + cancellation_events schema"
git push
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/supabase.types.ts`

- [ ] **Step 1: Read current file to locate organizations row type**

Read `src/types/supabase.types.ts`. Identify three blocks for `organizations`: `Row` (~line 10–20), `Insert` (~line 22–32), `Update` (~line 34–44). Identify any `Database` or `Tables` export shape around line 300+.

- [ ] **Step 2: Add columns to organizations Row/Insert/Update**

For each of the three `organizations` blocks, add these fields (maintaining existing formatting):

Row (all required on read):
```ts
retention_offer_used_at: string | null;
cancel_at_period_end: boolean;
```

Insert (optional — DB has defaults):
```ts
retention_offer_used_at?: string | null;
cancel_at_period_end?: boolean;
```

Update (optional):
```ts
retention_offer_used_at?: string | null;
cancel_at_period_end?: boolean;
```

If there is a standalone `Organization` interface (around line 300), add to it:
```ts
retention_offer_used_at: string | null;
cancel_at_period_end: boolean;
```

- [ ] **Step 3: Add cancellation_events table types**

Find the top-level `Tables` record in the file (alongside `organizations`, `memberships`, etc.). Add a new entry:

```ts
cancellation_events: {
  Row: {
    id: string;
    organization_id: string;
    user_id: string;
    reason: CancellationReason;
    outcome: CancellationOutcome;
    plan_tier_at_event: PlanTier;
    created_at: string;
  };
  Insert: {
    id?: string;
    organization_id: string;
    user_id: string;
    reason: CancellationReason;
    outcome: CancellationOutcome;
    plan_tier_at_event: PlanTier;
    created_at?: string;
  };
  Update: {
    id?: string;
    organization_id?: string;
    user_id?: string;
    reason?: CancellationReason;
    outcome?: CancellationOutcome;
    plan_tier_at_event?: PlanTier;
    created_at?: string;
  };
};
```

- [ ] **Step 4: Export the two new union types**

At the top of the file, alongside `PlanStatus` and `PlanTier`:

```ts
export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'switching_tools'
  | 'seasonal'
  | 'other';

export type CancellationOutcome = 'downgrade' | 'accepted_offer' | 'canceled';
```

- [ ] **Step 5: Build to verify types compile**

Run: `npm run build`
Expected: successful tsc pass with no errors. If types-only file, build will still exercise it via imports in Task 3 / Task 5.

- [ ] **Step 6: Commit**

```bash
git add src/types/supabase.types.ts
git commit -m "feat: add retention + cancellation_events types"
git push
```

---

## Task 3: Extend OrganizationContext with new fields

**Files:**
- Modify: `src/context/OrganizationContext.tsx:8-15` (Organization interface), `:58-69` (mapping)

- [ ] **Step 1: Extend the Organization interface**

Find the `interface Organization {` block. Add two fields:

```ts
interface Organization {
  id: string;
  name: string;
  slug: string;
  planStatus: PlanStatus;
  planTier: PlanTier;
  trialEndsAt: string;
  retentionOfferUsedAt: string | null;
  cancelAtPeriodEnd: boolean;
}
```

- [ ] **Step 2: Extend the row type cast and setOrg mapping**

Replace the existing `const o = membership.organizations as unknown as { ... }` cast to include the new fields:

```ts
const o = membership.organizations as unknown as {
  id: string; name: string; slug: string;
  plan_status: PlanStatus; plan_tier: PlanTier; trial_ends_at: string;
  retention_offer_used_at: string | null; cancel_at_period_end: boolean;
};
setOrg({
  id: o.id,
  name: o.name,
  slug: o.slug,
  planStatus: o.plan_status,
  planTier: o.plan_tier ?? 'basic',
  trialEndsAt: o.trial_ends_at,
  retentionOfferUsedAt: o.retention_offer_used_at ?? null,
  cancelAtPeriodEnd: o.cancel_at_period_end ?? false,
});
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: successful tsc pass.

- [ ] **Step 4: Commit**

```bash
git add src/context/OrganizationContext.tsx
git commit -m "feat: surface retention state in OrganizationContext"
git push
```

---

## Task 4: Create cancel-subscription edge function

**Files:**
- Create: `supabase/functions/cancel-subscription/index.ts`

- [ ] **Step 1: Write the edge function**

```ts
// supabase/functions/cancel-subscription/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const BASIC_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID_BASIC')!;
const RETENTION_COUPON_ID = Deno.env.get('STRIPE_RETENTION_COUPON_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'downgrade' | 'accept_offer' | 'cancel' | 'resume';
type Reason = 'too_expensive' | 'missing_features' | 'switching_tools' | 'seasonal' | 'other';

const VALID_ACTIONS: Action[] = ['downgrade', 'accept_offer', 'cancel', 'resume'];
const VALID_REASONS: Reason[] = ['too_expensive', 'missing_features', 'switching_tools', 'seasonal', 'other'];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, reason } = await req.json().catch(() => ({}));

    if (!VALID_ACTIONS.includes(action)) {
      return json(400, { error: 'Invalid action' });
    }
    if (action !== 'resume' && !VALID_REASONS.includes(reason)) {
      return json(400, { error: 'Invalid reason' });
    }

    // Auth
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: 'Unauthorized' });

    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(stripe_subscription_id, plan_status, plan_tier)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return json(403, { error: 'Only owners can manage billing' });
    }

    const org = membership.organizations as unknown as {
      stripe_subscription_id: string | null;
      plan_status: string;
      plan_tier: 'basic' | 'pro';
    };

    if (!org.stripe_subscription_id) {
      return json(400, { error: 'No active subscription' });
    }

    // Service-role client for writes (bypasses RLS on cancellation_events insert + org update)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const subId = org.stripe_subscription_id;
    const orgId = membership.organization_id;

    // Dispatch by action
    if (action === 'resume') {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
      return json(200, { ok: true, outcome: 'resumed' });
    }

    if (action === 'downgrade') {
      const sub = await stripe.subscriptions.retrieve(subId);
      const itemId = sub.items.data[0]?.id;
      if (!itemId) return json(500, { error: 'Subscription has no items' });
      await stripe.subscriptions.update(subId, {
        items: [{ id: itemId, price: BASIC_PRICE_ID }],
        proration_behavior: 'create_prorations',
      });
      await admin.from('cancellation_events').insert({
        organization_id: orgId,
        user_id: user.id,
        reason,
        outcome: 'downgrade',
        plan_tier_at_event: org.plan_tier,
      });
      return json(200, { ok: true, outcome: 'downgrade' });
    }

    if (action === 'accept_offer') {
      await stripe.subscriptions.update(subId, {
        discounts: [{ coupon: RETENTION_COUPON_ID }],
      });
      await admin.from('organizations')
        .update({ retention_offer_used_at: new Date().toISOString() })
        .eq('id', orgId);
      await admin.from('cancellation_events').insert({
        organization_id: orgId,
        user_id: user.id,
        reason,
        outcome: 'accepted_offer',
        plan_tier_at_event: org.plan_tier,
      });
      return json(200, { ok: true, outcome: 'accepted_offer' });
    }

    // action === 'cancel'
    if (org.plan_status === 'trialing') {
      await stripe.subscriptions.cancel(subId);
    } else {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }
    await admin.from('cancellation_events').insert({
      organization_id: orgId,
      user_id: user.id,
      reason,
      outcome: 'canceled',
      plan_tier_at_event: org.plan_tier,
    });
    return json(200, { ok: true, outcome: 'canceled' });

  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
```

- [ ] **Step 2: Set the retention coupon secret**

In Stripe Dashboard (live mode) → Products → Coupons → Create coupon:
- ID: `RETENTION_50_OFF_2MO`
- Type: Percentage, 50%
- Duration: Repeating, 2 months
- Save

Then set the Supabase secret:
```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase secrets set STRIPE_RETENTION_COUPON_ID=RETENTION_50_OFF_2MO \
  --project-ref hbranokmkritcdzozjli
```

Expected: `Finished supabase secrets set.`

- [ ] **Step 3: Deploy the edge function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase functions deploy cancel-subscription --no-verify-jwt \
  --project-ref hbranokmkritcdzozjli
```

Expected: `Deployed Functions on project hbranokmkritcdzozjli: cancel-subscription`.

- [ ] **Step 4: Smoke-test the auth guards**

With an unauthenticated curl:
```bash
curl -i -X POST 'https://hbranokmkritcdzozjli.supabase.co/functions/v1/cancel-subscription' \
  -H 'Content-Type: application/json' \
  -d '{"action":"cancel","reason":"other"}'
```

Expected: HTTP 401 with `{"error":"Unauthorized"}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/cancel-subscription/index.ts
git commit -m "feat: cancel-subscription edge function"
git push
```

---

## Task 5: Client service wrapping the edge function

**Files:**
- Create: `src/services/cancellationService.ts`

- [ ] **Step 1: Write the service**

```ts
// src/services/cancellationService.ts
import { supabase } from '../config/supabase';
import type { CancellationReason } from '../types/supabase.types';

export type CancellationAction = 'downgrade' | 'accept_offer' | 'cancel' | 'resume';

export interface CancellationResult {
  ok: true;
  outcome: 'downgrade' | 'accepted_offer' | 'canceled' | 'resumed';
}

export async function submitCancellation(
  action: CancellationAction,
  reason?: CancellationReason,
): Promise<CancellationResult> {
  const body: Record<string, unknown> = { action };
  if (action !== 'resume') {
    if (!reason) throw new Error('Reason required for this action');
    body.reason = reason;
  }

  const { data, error } = await supabase.functions.invoke('cancel-subscription', { body });
  if (error) throw error;
  return data as CancellationResult;
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: successful tsc pass.

- [ ] **Step 3: Commit**

```bash
git add src/services/cancellationService.ts
git commit -m "feat: cancellationService client"
git push
```

---

## Task 6: Webhook — write cancel_at_period_end on subscription.updated

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts:53-62` (the `customer.subscription.updated` case)

- [ ] **Step 1: Extend the update handler**

Replace the existing `customer.subscription.updated` case with:

```ts
case 'customer.subscription.updated': {
  const sub = event.data.object as Stripe.Subscription;
  const orgId = sub.metadata.organization_id;
  if (orgId) {
    await supabase.from('organizations').update({
      plan_tier: getTierFromSubscription(sub),
      cancel_at_period_end: sub.cancel_at_period_end,
    }).eq('id', orgId);
  }
  break;
}
```

Also extend `customer.subscription.deleted` to clear the flag on final delete (keeps the DB tidy after period end fires):

```ts
case 'customer.subscription.deleted': {
  const sub = event.data.object as Stripe.Subscription;
  const orgId = sub.metadata.organization_id;
  if (orgId) {
    await supabase.from('organizations').update({
      plan_status: 'canceled',
      cancel_at_period_end: false,
    }).eq('id', orgId);
  }
  break;
}
```

- [ ] **Step 2: Deploy the updated webhook**

```bash
SUPABASE_ACCESS_TOKEN=sbp_961e53bf63ca3f9c822bb572023b8f3f58d7fb38 \
  supabase functions deploy stripe-webhook --no-verify-jwt \
  --project-ref hbranokmkritcdzozjli
```

Expected: `Deployed Functions on project hbranokmkritcdzozjli: stripe-webhook`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: webhook writes cancel_at_period_end"
git push
```

---

## Task 7: CancellationModal component

**Files:**
- Create: `src/components/settings/CancellationModal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
// src/components/settings/CancellationModal.tsx
import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { submitCancellation } from '../../services/cancellationService';
import type { CancellationReason } from '../../types/supabase.types';

type Step = 'reason' | 'offer' | 'confirm' | 'resume';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a terminal server-confirmed action so the parent can refresh org state. */
  onChanged: () => void;
}

const REASON_OPTIONS: { value: CancellationReason; label: string }[] = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching_tools', label: "Switching to another tool" },
  { value: 'seasonal', label: 'Seasonal / slow time of year' },
  { value: 'other', label: 'Other' },
];

export function CancellationModal({ open, onClose, onChanged }: Props) {
  const { org } = useOrganization();
  const [step, setStep] = useState<Step>(() => {
    if (org?.cancelAtPeriodEnd) return 'resume';
    return 'reason';
  });
  const [reason, setReason] = useState<CancellationReason | null>(null);
  // Tracks the Pro "Switch to Basic" decline so we can advance to the 50% off offer.
  const [proDowngradeDeclined, setProDowngradeDeclined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !org) return null;

  const offerEligible =
    org.retentionOfferUsedAt === null &&
    org.planStatus !== 'trialing' &&
    org.planStatus !== 'past_due';

  const tier = org.planTier;

  async function call(action: 'downgrade' | 'accept_offer' | 'cancel' | 'resume', r?: CancellationReason) {
    setLoading(true);
    setError(null);
    try {
      await submitCancellation(action, r);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong. Try again or contact support.');
    } finally {
      setLoading(false);
    }
  }

  function advanceFromReason() {
    if (!reason) return;
    if (!offerEligible) {
      setStep('confirm');
      return;
    }
    setStep('offer');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Resume path */}
        {step === 'resume' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription ending soon</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your subscription is scheduled to end. You'll keep access until the end of your current billing period.
              Want to resume it?
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => call('resume')}
                disabled={loading}
                className="flex-1 bg-navy text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Resume subscription'}
              </button>
            </div>
          </>
        )}

        {/* Step 1: reason */}
        {step === 'reason' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sorry to see you go</h2>
            <p className="text-sm text-gray-600 mb-4">Mind telling us why?</p>
            <div className="space-y-2 mb-4">
              {REASON_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={() => setReason(opt.value)}
                  />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Never mind
              </button>
              <button
                onClick={advanceFromReason}
                disabled={!reason}
                className="flex-1 bg-navy text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: offer (only if offerEligible) */}
        {step === 'offer' && tier === 'pro' && !proDowngradeDeclined && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Want to keep the essentials?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Switch to Basic for $29/mo instead. Keeps the calculator and bids — you can upgrade back anytime.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setProDowngradeDeclined(true)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                No thanks
              </button>
              <button
                onClick={() => call('downgrade', reason!)}
                disabled={loading}
                className="flex-1 bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Switch to Basic'}
              </button>
            </div>
          </>
        )}

        {step === 'offer' && (tier === 'basic' || proDowngradeDeclined) && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Stay for 50% off</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your next 2 months at half price. No strings — just a little something to say "give us another shot."
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('confirm')}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                No thanks
              </button>
              <button
                onClick={() => call('accept_offer', reason!)}
                disabled={loading}
                className="flex-1 bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Accept offer'}
              </button>
            </div>
          </>
        )}

        {/* Step 3: confirm */}
        {step === 'confirm' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirm cancellation</h2>
            <p className="text-sm text-gray-600 mb-4">
              {org.planStatus === 'trialing'
                ? 'Your trial will end immediately and your subscription will be canceled.'
                : "Your subscription will end at the end of your current billing period. You'll keep full access until then."}
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Keep subscription
              </button>
              <button
                onClick={() => call('cancel', reason!)}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Working…' : 'Cancel subscription'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: successful tsc pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/CancellationModal.tsx
git commit -m "feat: CancellationModal with reason/offer/confirm/resume"
git push
```

---

## Task 8: Wire modal into BillingSettings

**Files:**
- Modify: `src/components/settings/BillingSettings.tsx`

- [ ] **Step 1: Add imports, modal state, and cancel-scheduled UI**

Replace the file contents with:

```tsx
import { useState } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { createCheckoutSession, createPortalSession } from '../../services/billingService';
import { CancellationModal } from './CancellationModal';

export function BillingSettings() {
  const { org, role } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!org) return null;

  const isOwner = role === 'owner';
  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();
  const isActive = org.planStatus === 'active';
  const isPastDue = org.planStatus === 'past_due';
  const scheduledToEnd = org.cancelAtPeriodEnd;

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
                {org.planTier === 'pro' ? 'Pro' : 'Basic'} &mdash; ${org.planTier === 'pro' ? '49' : '29'}/mo
              </span>
            )}
            <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
              scheduledToEnd ? 'bg-orange-100 text-orange-800' :
              isActive ? 'bg-green-100 text-green-800' :
              isTrialing && !trialExpired ? 'bg-blue-100 text-blue-800' :
              isPastDue ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {scheduledToEnd ? 'Ending soon' :
               isActive ? 'Active' :
               isTrialing && !trialExpired ? 'Free Trial' :
               isPastDue ? 'Past Due' :
               'Inactive'}
            </span>
          </div>
        </div>

        {isTrialing && !trialExpired && !scheduledToEnd && (
          <p className="text-sm text-gray-600 mb-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString()}
          </p>
        )}

        {scheduledToEnd && (
          <p className="text-sm text-orange-700 mb-3">
            Your subscription is scheduled to end. You'll keep full access until the end of your current billing period.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex-1 min-w-[140px] bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Manage Billing'}
              </button>
              {org.planTier === 'basic' && !scheduledToEnd && (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex-1 min-w-[140px] bg-gold text-navy py-2 px-4 rounded-lg text-sm font-display font-700 uppercase tracking-wide hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="w-full sm:w-auto text-sm text-gray-500 hover:text-gray-700 underline py-2 px-2"
                >
                  {scheduledToEnd ? 'Manage cancellation' : 'Cancel subscription'}
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

      <CancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onChanged={() => window.location.reload()}
      />
    </div>
  );
}
```

Notes:
- Cancel link is only rendered for owners (`role === 'owner'`). Non-owners never see it.
- On successful action, we reload so `OrganizationContext` re-fetches the new plan state from Supabase. Simplest correct solution; no client-side state surgery needed.
- When `scheduledToEnd === true`, the cancel link becomes "Manage cancellation" and the modal opens directly into the resume step.
- `Upgrade to Pro` is hidden when cancellation is scheduled so we don't send mixed signals.

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: successful tsc pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/BillingSettings.tsx
git commit -m "feat: wire CancellationModal into BillingSettings"
git push
```

---

## Task 9: Pre-launch payment verification (no code — run before E2E)

This task has no code. Run through it before Task 10 so we ship on top of a known-good payment baseline.

- [ ] **Step 1: Confirm Stripe live mode + price IDs**

In Stripe Dashboard (live mode), go to Products → confirm two active products with recurring prices: Basic ($29/mo) and Pro ($49/mo). Copy the `price_...` IDs.

Then in Supabase Dashboard → Project Settings → Edge Functions → Secrets, verify `STRIPE_PRICE_ID_BASIC` and `STRIPE_PRICE_ID_PRO` match the live price IDs exactly. (If they don't: `supabase secrets set ... --project-ref hbranokmkritcdzozjli`.)

- [ ] **Step 2: Confirm webhook signing secret**

Stripe Dashboard (live mode) → Developers → Webhooks → find the endpoint pointing to `https://hbranokmkritcdzozjli.supabase.co/functions/v1/stripe-webhook` → reveal signing secret. In Supabase Edge Function secrets, confirm `STRIPE_WEBHOOK_SECRET` matches. Fix if mismatched.

Also confirm the endpoint is subscribed to at minimum: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

- [ ] **Step 3: Real $29 Basic purchase (end-to-end)**

- Open an incognito browser window.
- Go to `https://www.coatcalc.com`, sign up a throwaway account (e.g. `steven+test-retention@simpleav.co`).
- Complete onboarding.
- Go to `/subscribe` → choose **Basic** → complete Stripe checkout with a real personal card.

Verify (Supabase SQL editor):
```sql
SELECT id, name, plan_status, plan_tier, stripe_customer_id, stripe_subscription_id
FROM organizations
WHERE name = '<throwaway org name>';
```
Expected: `plan_status = 'active'`, `plan_tier = 'basic'`, both Stripe IDs populated.

- [ ] **Step 4: Refund and clean up**

In Stripe Dashboard (live mode) → Payments → find the charge → **Refund**. Then cancel the subscription from Stripe Dashboard. Delete the throwaway auth user from Supabase Dashboard → Authentication.

- [ ] **Step 5: Failure path (optional but recommended — test mode only)**

This requires a staging branch with test-mode Stripe keys. If you don't have one: skip; trust Stripe's `invoice.payment_failed` handling (unchanged by this PR).

If you do: repeat Step 3 in test mode using card `4000000000000341` (succeeds but fails to attach). Verify `plan_status = 'past_due'`.

---

## Task 10: End-to-end retention flow verification on live

Run in an incognito window on `https://www.coatcalc.com` using a real card against live Stripe.

- [ ] **Step 1: Basic owner — accept 50% off**

Sign up throwaway org → subscribe to Basic → go to Settings → Billing → **Cancel subscription** → pick any reason → on offer step click **Accept offer**.

Verify:
- Modal closes, page reloads, plan shows **Active** Basic.
- In Stripe Dashboard → Customers → this customer → Subscriptions → discount column shows `RETENTION_50_OFF_2MO` applied.
- Supabase: `SELECT retention_offer_used_at FROM organizations WHERE id = '...';` is non-null.
- Supabase: `SELECT reason, outcome FROM cancellation_events WHERE organization_id = '...';` shows one row with `outcome = 'accepted_offer'`.

- [ ] **Step 2: Pro owner — switch to Basic (downgrade)**

With a new throwaway org, subscribe to Pro → Cancel subscription → pick reason → **Switch to Basic**.

Verify:
- `plan_tier = 'basic'` in Supabase.
- Stripe: upcoming invoice shows a proration credit and the subscription is now on the Basic price.
- `cancellation_events` has one row, `outcome = 'downgrade'`, `plan_tier_at_event = 'pro'`.

- [ ] **Step 3: Pro owner — decline downgrade, accept 50% off**

New throwaway, Pro sub → Cancel → reason → **No thanks** on downgrade step → **Accept offer** on 50%-off step.

Verify: `plan_tier` still `pro`, discount applied in Stripe, `retention_offer_used_at` set, `cancellation_events` has `outcome = 'accepted_offer'` and `plan_tier_at_event = 'pro'`.

- [ ] **Step 4: Confirm cancel**

New throwaway, Basic sub → Cancel → reason → **No thanks** on offer → **Cancel subscription** on confirm.

Verify:
- Status badge flips to **Ending soon** (orange).
- Cancel link text changes to **Manage cancellation**.
- Stripe: subscription shows `cancel_at_period_end = true` with period end date.
- `cancellation_events` shows `outcome = 'canceled'`.

- [ ] **Step 5: Resume after scheduled cancel**

From the state at end of Step 4 → click **Manage cancellation** → **Resume subscription**.

Verify:
- Badge returns to **Active**.
- Stripe: `cancel_at_period_end = false`.
- No new row in `cancellation_events` (resume is not a terminal cancel-path action).

- [ ] **Step 6: Already-used-offer skips Step 2**

Use the org from Step 1 (has `retention_offer_used_at` set) → Cancel subscription → pick reason → verify modal goes straight to the **Confirm cancellation** step (no offer shown). Click **Keep subscription** to bail.

- [ ] **Step 7: Trial user cancel skips offer**

New throwaway org that has NOT subscribed — it's on the 14-day trial. Go to Billing → cancel flow should only be available if there's a subscription. (Pre-paid trial with `stripe_subscription_id` populated: Cancel → reason → confirm; no offer step. Edge function uses `stripe.subscriptions.cancel()` immediately.)

If there's no `stripe_subscription_id` (trial without ever starting checkout), the Cancel button should still 400 cleanly from the edge function — verify inline error appears and UI stays consistent.

- [ ] **Step 8: Non-owner cannot cancel**

Log in as an admin or estimator in an existing org → go to Settings → Billing → the **Cancel subscription** link does not appear.

Belt-and-suspenders: open devtools and manually call `supabase.functions.invoke('cancel-subscription', { body: { action: 'cancel', reason: 'other' } })` → expect 403.

- [ ] **Step 9: Past-due skips offer (manual setup)**

Can only be simulated via a previously failed invoice. Skip on first ship if no past-due customer exists; revisit when one naturally occurs.

- [ ] **Step 10: Clean up all throwaway orgs**

Refund any real charges in Stripe. Cancel all test subscriptions. Delete throwaway users in Supabase Auth.

- [ ] **Step 11: Final commit**

No code changes from this task. If anything surfaced during testing that required fixes, each fix should already be its own commit (per Task 1–8 pattern). Otherwise nothing to commit.

---

## Self-Review (Plan vs Spec)

**Spec coverage check:**
- ✅ Section 1 (User Flow, 3-step state machine, resume path) → Task 7 CancellationModal state machine + Task 8 entry point
- ✅ Section 2 (Edge function with 4 actions) → Task 4
- ✅ Section 2 (Modal + service) → Tasks 5, 7
- ✅ Section 2 (Stripe Dashboard coupon + secret) → Task 4 Step 2
- ✅ Section 2 (Webhook writes `cancel_at_period_end`) → Task 6
- ✅ Section 3 (Migration: two columns + cancellation_events + RLS) → Task 1
- ✅ Section 4 (Edge cases: resume, trial, past-due, Stripe failure, non-owner, race) → Task 7 modal logic + Task 4 edge function + Task 10 verification matrix
- ✅ Section 5 (Pre-launch payment verification) → Task 9
- ✅ Section 5 (Retention flow tests) → Task 10

**Naming consistency check:**
- Edge function: `cancel-subscription` — used consistently Tasks 4, 5, 8.
- Columns: `retention_offer_used_at`, `cancel_at_period_end` (snake_case in DB, camelCase in client types `retentionOfferUsedAt`, `cancelAtPeriodEnd`) — consistent across Tasks 1, 2, 3, 4, 6, 7, 8.
- Actions: `downgrade` / `accept_offer` / `cancel` / `resume` — identical in edge function (Task 4), service (Task 5), modal (Task 7).
- Outcomes in `cancellation_events`: `downgrade` / `accepted_offer` / `canceled` — identical in migration CHECK (Task 1) and edge function inserts (Task 4).

**Placeholder scan:** None — every step has full code or exact commands. No "TBD", no "add appropriate error handling," no "similar to Task N."

**Scope:** Single focused plan. Not decomposable further — all tasks share the retention flow as their single unit of work.
