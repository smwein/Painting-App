# Two-Tier Pricing & Feature Gating

**Date:** 2026-04-14
**Status:** Approved
**Summary:** Split the single $29/mo plan into Basic ($29/mo) and Pro ($49/mo). Gate quote emailing, public quote pages, presentation builder, and quote tracking behind Pro. Grandfather existing customers into Pro. Foundation for Stripe Connect payments (separate spec).

---

## 1. Tier Model & Database

New column on `organizations` table:

```sql
ALTER TABLE organizations ADD COLUMN plan_tier text NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro'));
```

Tier mapping:
- `plan_tier = 'basic'` + `plan_status = 'active'` = $29/mo Basic
- `plan_tier = 'pro'` + `plan_status = 'active'` = $49/mo Pro
- `plan_status = 'trialing'` = Pro features during trial (full product experience before choosing a plan)

Migration for existing customers:
```sql
UPDATE organizations SET plan_tier = 'pro' WHERE plan_status IN ('active', 'trialing');
```

## 2. Stripe Configuration

One Stripe Product ("CoatCalc") with two Prices:
- `STRIPE_PRICE_ID_BASIC` — $29/mo recurring
- `STRIPE_PRICE_ID_PRO` — $49/mo recurring

These replace the single `STRIPE_PRICE_ID` environment variable. Both env vars are set on the Supabase edge functions.

## 3. Feature Gating

### Pro-only features:
- Send Quote (email quotes to customers)
- Public quote pages
- Presentation builder (Settings tab)
- Quote tracking (status badges, view counts, activity info on Saved Bids)
- Resend / Copy Link buttons (only exist for sent quotes, which require Pro)
- Future: Stripe Connect customer payments (separate spec)

### Basic features ($29/mo):
- All 5 calculator types
- Save bids
- PDF export
- Custom pricing & settings
- Team accounts (unlimited members)
- Clone / delete bids

### Gating implementation

`OrganizationContext` exposes a convenience check:

```tsx
const isProTier = org.planTier === 'pro' || org.planStatus === 'trialing';
```

Gated features show an **upgrade nudge** rather than being hidden — the painter sees the UI element but clicking it opens a prompt: "Upgrade to Pro to email quotes to customers." This is better for conversion than invisible features.

### Gated touchpoints:
1. **Saved Bids** — "Send" button shows upgrade nudge if Basic
2. **Settings** — "Presentation" tab shows upgrade nudge if Basic
3. **Settings** — Quote-related presentation settings show upgrade nudge if Basic

Non-gated: Resend / Copy Link buttons only appear for bids with existing quotes. Since Basic users can't send quotes, these buttons never appear for them — no explicit gating needed.

## 4. Subscribe Page

Two-card comparison layout:

| Feature | Basic — $29/mo | Pro — $49/mo |
|---|---|---|
| 5 Calculator Types | yes | yes |
| Custom Pricing & Settings | yes | yes |
| PDF Export | yes | yes |
| Team Accounts | yes | yes |
| Unlimited Bids | yes | yes |
| Email Quotes to Customers | | yes |
| Public Quote Pages | | yes |
| Presentation Builder | | yes |
| Quote Tracking & Activity | | yes |
| Customer Payments | | coming soon |

Each card has a "Subscribe" CTA that redirects to Stripe Checkout with the corresponding price ID.

## 5. Upgrade & Downgrade Flows

### Upgrade (Basic to Pro):
- Triggered from upgrade nudges throughout the app or from Billing tab in Settings
- Calls `create-checkout` edge function with the Pro price ID
- Stripe handles proration automatically (customer pays the difference for the current billing period)
- Webhook fires `checkout.session.completed` → sets `plan_tier = 'pro'`

### Downgrade (Pro to Basic):
- Through Stripe Billing Portal (already wired up via `create-portal`)
- Painter switches plan in portal → webhook fires `customer.subscription.updated` → sets `plan_tier = 'basic'`
- Existing sent quotes remain accessible (public URLs do not break) but no new quotes can be sent

## 6. Edge Function Changes

### `create-checkout`
- Accepts a `tier` parameter (`'basic'` or `'pro'`) from the client
- Maps tier to the corresponding `STRIPE_PRICE_ID_BASIC` or `STRIPE_PRICE_ID_PRO` env var
- Validates the tier parameter is one of the two known values
- Passes the resolved price ID to `stripe.checkout.sessions.create`

### `stripe-webhook`
- `checkout.session.completed`: Reads the subscription's price ID from the Stripe subscription object. Maps price ID to `plan_tier` value. Writes both `plan_status = 'active'` and `plan_tier` to the organization row.
- `customer.subscription.updated` (new event): Handles plan switches. Reads the new price ID from the subscription items, maps to `plan_tier`, updates the organization.
- `invoice.paid`: No tier change. Sets `plan_status = 'active'` as before.
- `invoice.payment_failed`: No tier change. Sets `plan_status = 'past_due'` as before.
- `customer.subscription.deleted`: No tier change. Sets `plan_status = 'canceled'` as before.

### `create-portal`
No changes. Stripe's billing portal handles plan switching natively when two prices exist on one product.

## 7. Type & Store Changes

### Types (`supabase.types.ts`):
- Add `PlanTier = 'basic' | 'pro'`
- Add `planTier: PlanTier` to the `Organization` interface

### `OrganizationContext.tsx`:
- Load `plan_tier` from the org row alongside existing fields
- Expose `org.planTier` and `isProTier` convenience boolean

### `billingService.ts`:
- `createCheckoutSession` accepts a `tier: 'basic' | 'pro'` parameter
- Passes tier to the `create-checkout` edge function

### `SubscriptionGate.tsx`:
No changes. It checks active/canceled/trial status only, not tier. Both tiers pass the gate.

## 8. Grandfathering Existing Customers

All organizations with `plan_status = 'active'` or `plan_status = 'trialing'` at the time of migration are set to `plan_tier = 'pro'`. New organizations default to `plan_tier = 'basic'`.

No email notification required for this migration — existing customers see no change in their experience. Their Stripe subscription remains at $29/mo with Pro features.
