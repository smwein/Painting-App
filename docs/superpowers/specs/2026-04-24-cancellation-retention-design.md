# Cancellation Retention Flow — Design

**Date:** 2026-04-24
**Status:** Approved, ready for implementation plan
**Context:** Pre-launch. Owners today cancel via Stripe Billing Portal with no reason capture and no retention offer. We want a branded in-app cancel flow that (1) captures why they're leaving and (2) offers a save: Pro owners get a Basic downgrade option, Basic owners get 50% off for 2 months. Also verify live payments work before ship.

---

## 1. User Flow (owner-facing)

`BillingSettings` keeps the existing **Manage Billing** button (routes to Stripe Billing Portal for invoices + card updates). A new secondary **Cancel subscription** button opens an in-app modal.

Modal is a 3-step state machine:

### Step 1 — Reason
Prompt: "Sorry to see you go. Mind telling us why?"
Options (single-select):
- Too expensive
- Missing features I need
- Switching to another tool
- Seasonal / slow time of year
- Other

### Step 2 — Retention offer
`retention_offer_used_at` is the master gate: if set, Step 2 is skipped entirely regardless of tier (user already had their one save). If null, branches by plan tier:

| Tier | `retention_offer_used_at` | Behavior |
|------|---------------------------|----------|
| Pro  | null                      | Show **Switch to Basic for $29/mo?** → on decline, advance to 50% off offer |
| Pro  | set                       | Skip Step 2 entirely |
| Basic | null                     | Show **Stay for 50% off your next 2 months?** |
| Basic | set                       | Skip Step 2 entirely |

Trial and past-due subs skip Step 2 entirely (no billing to discount yet, or already failing to pay).

### Step 3 — Confirm cancellation
"Your subscription will end on {period_end_date}. You'll keep full access until then."
Actions: **[Cancel subscription]** / **[Keep subscription]**

### Terminal outcomes
- **Switch to Basic** → Stripe subscription item swapped to Basic price with prorations. Stays active. Logged to `cancellation_events` with `outcome = 'downgrade'`.
- **Accept 50% off** → Coupon applied to current subscription. `retention_offer_used_at` set to `now()`. Logged with `outcome = 'accepted_offer'`.
- **Confirm cancel** → `cancel_at_period_end = true` on Stripe sub. Org retains access until period end. Logged with `outcome = 'canceled'`.
- **Trial cancel** → `stripe.subscriptions.cancel()` (immediate, trial isn't paying yet). Logged.

### Already-scheduled-to-cancel state
If modal is opened and Stripe reports `cancel_at_period_end = true`, it renders in read-only resume mode: "Your subscription is already scheduled to end on {date}. Want to resume it?" → **[Resume subscription]** (sets `cancel_at_period_end = false`). Reason/offer steps are skipped.

---

## 2. Technical Architecture

### New edge function: `cancel-subscription`
Single function owning all cancellation-path Stripe mutations. Owner-only, mirrors the auth check in `create-portal`.

Request body:
```ts
{
  action: 'downgrade' | 'accept_offer' | 'cancel' | 'resume',
  reason?: string  // required for downgrade | accept_offer | cancel, omitted for resume
}
```

Action handlers:
- `downgrade` → `stripe.subscriptions.update(subId, { items: [{ id: itemId, price: BASIC_PRICE_ID }], proration_behavior: 'create_prorations' })`
- `accept_offer` → `stripe.subscriptions.update(subId, { discounts: [{ coupon: RETENTION_COUPON_ID }] })`, then update `organizations.retention_offer_used_at = now()`
- `cancel` (paid sub) → `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
- `cancel` (trialing sub) → `stripe.subscriptions.cancel(subId)` (immediate)
- `resume` → `stripe.subscriptions.update(subId, { cancel_at_period_end: false })`

All non-`resume` actions also insert a row into `cancellation_events` before returning success. DB writes happen only after Stripe confirms success — no partial state.

### New modal component
`src/components/settings/CancellationModal.tsx` — controlled by `BillingSettings`. Local state machine with `'reason' | 'offer' | 'confirm' | 'resume'` steps. Pure presentational. Calls the new service on each terminal action.

### New service
`src/services/cancellationService.ts` — single exported function:
```ts
submitCancellation(action, reason?): Promise<void>
```
Wraps the edge function call and surfaces errors to the modal.

### Stripe Dashboard setup (one-time manual)
1. Create coupon in live mode: `RETENTION_50_OFF_2MO` — 50% off, duration `repeating`, 2 months.
2. Store coupon ID in Supabase Edge Function secrets: `STRIPE_RETENTION_COUPON_ID`.

### Webhook changes
Extend `customer.subscription.updated` handler to also write `cancel_at_period_end` into `organizations`. No other webhook changes needed — existing handlers already cover price changes and final deletion.

### What's NOT changing
- Stripe Billing Portal stays available for invoices + card updates via existing **Manage Billing** button.
- `create-checkout` unchanged.
- `create-portal` unchanged.
- Existing webhook events (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`) unchanged.

---

## 3. Data Model Changes

Migration: `supabase/migrations/006_retention.sql`

### `organizations` — two new columns
```sql
ALTER TABLE organizations
  ADD COLUMN retention_offer_used_at timestamptz NULL,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
```
- `retention_offer_used_at` — gates the offer-again check. Non-null = already redeemed 50% off once. Never reset.
- `cancel_at_period_end` — mirrors Stripe's flag so UI can render "ends on X" without a Stripe round-trip. Written by the webhook on `customer.subscription.updated`.

### New table `cancellation_events`
```sql
CREATE TABLE cancellation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('downgrade','accepted_offer','canceled')),
  plan_tier_at_event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cancellation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their org cancellation events"
  ON cancellation_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Writes are service-role only (from the edge function). No INSERT policy needed for users.
```

One row per terminal cancellation action. Enables product learning without a separate analytics tool.

---

## 4. Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Sub already `cancel_at_period_end = true` | Modal opens in resume mode. No reason/offer steps. |
| Trialing sub | Skip offer step (no billing to discount). Reason → confirm. Cancel is immediate. |
| Past-due sub | Skip offer step (don't discount a non-paying sub). Reason → confirm. |
| Stripe API fails mid-flow | Edge function returns error. Modal shows inline error. DB state unchanged (writes are gated on Stripe success). |
| User closes modal mid-flow | No DB writes. Reason captured only at terminal action. |
| Webhook arrives before edge function returns | No conflict — webhook writes `plan_tier` / `plan_status` / `cancel_at_period_end`; edge function writes `retention_offer_used_at`. Disjoint columns. |
| Basic owner cancel | Flow: reason → 50% off offer → confirm. No downgrade step. |
| Any owner who already used offer | Flow: reason → confirm. Step 2 skipped entirely. |
| Non-owner member tries to cancel | Cancel button not rendered. Edge function also returns 403 as defense in depth. |
| Coupon application timing | Discount takes effect on next invoice. No refund on current invoice — forward-applied, industry standard. |

---

## 5. Testing Plan

### Pre-launch payment verification (separate from retention flow — run before shipping anything)
1. **Stripe Dashboard** — confirm live mode, confirm `STRIPE_PRICE_ID_BASIC` and `STRIPE_PRICE_ID_PRO` point to live prices (not test).
2. **Webhook signing secret** — confirm `STRIPE_WEBHOOK_SECRET` in Supabase matches the live webhook endpoint in Stripe Dashboard.
3. **Real $29 purchase** — sign up a throwaway org, subscribe to Basic with a real card, verify `organizations.plan_status = 'active'` and `stripe_subscription_id` populated, then refund in Stripe Dashboard.
4. **Failure path** — in test mode on a staging branch, use Stripe test card `4000000000000341` and verify `plan_status` flips to `past_due`.

### Retention flow tests (post-build)
- Basic owner accepts 50% off → `retention_offer_used_at` set, next invoice preview shows 50% discount, plan still active.
- Pro owner switches to Basic → `plan_tier = 'basic'`, proration created, no coupon used, `cancellation_events.outcome = 'downgrade'`.
- Pro owner declines Basic then accepts 50% off → both branches reached, coupon applied.
- Owner with `retention_offer_used_at` set → Step 2 skipped entirely (no downgrade re-offer, no discount re-offer). Flow is reason → confirm.
- Confirm cancel (paid) → `cancel_at_period_end = true`, UI shows end date, access works until period end.
- Confirm cancel (trial) → immediate cancellation, plan_status = 'canceled'.
- Resume after cancel → `cancel_at_period_end = false`, UI returns to normal.
- Non-owner (admin/estimator) → cancel button hidden; direct edge function call returns 403.
- Past-due sub cancel → offer step skipped.
- Every terminal action writes a `cancellation_events` row with correct reason, outcome, and `plan_tier_at_event`.

### Not testing
- Stripe proration math, coupon math — trust Stripe.
- Stripe Billing Portal behavior — untouched by this change.

---

## Out of scope (explicitly)
- Multi-use retention offers (one redemption per org, ever).
- Reactivation flows after full cancellation completes (period-end past).
- Email notifications on cancel / downgrade / offer acceptance.
- Analytics dashboard over `cancellation_events` — data is captured; reporting UI is a later phase.
- Custom retention offers per tenure or spend. The 50% off / 2 months rule is static for v1.
