# Time-Based Discount with Countdown Banner — Design Spec

**Date:** 2026-04-24
**Status:** Approved design, ready for planning
**Tier:** Pro feature

## Goal

Let painters attach a limited-time discount (% or fixed $) to a sent quote so the customer sees a countdown banner and an itemized discount line on the public quote page. When the timer expires, the discount falls away cleanly — but the quote stays acceptable at full price. Matches the real-world sales tactic: *"if you sign by Friday I can do 10% off."*

## Decisions Made During Brainstorming

1. **Per-quote, not org-wide.** Each quote send-out carries its own optional discount. No campaign-management UI.
2. **Fixed end date/time, not a duration.** Painter picks "Apr 26 at 11:59 PM," not "valid for 48 hours." Matches sales language and avoids "when does the timer start?" ambiguity.
3. **On expiration: banner flips to "expired," total reverts to original.** Honest, matches real promotional behavior, doesn't burn the deal.
4. **Discount type: percent or fixed dollar.** Painter picks per quote. Both are common in trades.
5. **Discount appears as a line item in the quote totals.** Fits existing itemized contract presentation.
6. **Painter sets it in the existing Send Quote modal.** Optional collapsible section, default off.
7. **Locked at send for v1.** No "Extend offer" action. If terms change, painter sends a new quote.

## Data Model

Single migration extending `public_quotes`:

```sql
ALTER TABLE public_quotes
  ADD COLUMN discount_type text NULL CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN discount_value numeric(10,2) NULL CHECK (discount_value > 0),
  ADD COLUMN discount_expires_at timestamptz NULL,
  ADD COLUMN accepted_total numeric(10,2) NULL,
  ADD CONSTRAINT discount_all_or_none CHECK (
    (discount_type IS NULL AND discount_value IS NULL AND discount_expires_at IS NULL)
    OR
    (discount_type IS NOT NULL AND discount_value IS NOT NULL AND discount_expires_at IS NOT NULL)
  );
```

`accepted_total` is the source of truth for what the customer agreed to — populated only at acceptance time, after the server validates whether the discount was still active.

All three fields are nullable; either all set or all null (CHECK enforces). No new tables. The discount is a property of the quote send-out, not the bid math.

**Authority:**
- Client computes `now() < discount_expires_at` for live tick-down UX.
- Server (acceptance endpoint) recomputes `now() < discount_expires_at` at the moment of acceptance and stamps the actual accepted total on the row. Server is source of truth.

## Painter UX

**Location.** Inside the existing **Send Quote modal**, a new collapsible section below customer name/email:

```
┌─ Add a limited-time discount? (toggle) ────────────────┐
│  Discount type:    ( ) Percentage   ( ) Fixed dollar    │
│  Discount value:   [        ] %                         │
│  Expires:          [ Apr 26, 2026  ] [ 11:59 PM ▾ ]    │
│  Painter's local time. Customer sees countdown in their │
│  time zone.                                              │
└─────────────────────────────────────────────────────────┘
```

Default collapsed/off. Toggle on → all three fields required.

**Validation (client + server):**
- `discount_value > 0`
- Percent: `discount_value <= 90`
- Fixed: `discount_value < bid_total` (validated server-side in send-quote edge function with bid context)
- `discount_expires_at > now() + 1 hour`

**Pro-tier gating.** UI hidden for Basic-tier orgs via existing `useOrganizationContext().isProTier`. Server-side: send-quote edge function rejects discount fields from non-Pro orgs.

**Saved Bids / Sent Quotes list.** Discounted quotes get a badge: `🏷️ 10% off · expires in 1d 4h` (active) or `🏷️ Offer expired` (gray, after expiration). Informational only; no actions in v1.

**Email to customer.** Existing send-quote email gets one extra sentence: *"This quote includes a limited-time 10% discount that expires Friday, Apr 26 at 11:59 PM."*

## Customer UX (Public Quote Page)

**Banner placement.** Full-width strip at the top of `PublicQuote.tsx`, above the existing header. Not sticky — countdown is the hook on first view, not a permanent nag.

**Active state (timer > 0):**
```
🕐 Limited-time offer: 10% off
   Expires in 2d 14h 32m
```
Brand teal/gold accent. Countdown updates every second.

**Expired state (timer ≤ 0):**
```
⏱ This offer has expired
   The original price is still valid — contact us to discuss
```
Muted gray, neutral tone. Doesn't kill the deal.

**Discount line in totals.** When active:
```
Subtotal              $10,000
Limited-time discount   −$1,000
─────────────────────
Total                  $9,000
```
When expired, the line disappears, total reverts to subtotal.

**Live tick-down.**
- On page load: compute remaining ms (`discount_expires_at - Date.now()`). If ≤ 0, render expired state immediately.
- During session: `setInterval(1000)` updates the countdown. When it hits 0, banner swaps state and discount line removes from totals. No page reload.
- Format:
  - `> 24h`: `2d 14h 32m`
  - `> 1h`: `4h 32m 18s`
  - `> 1m`: `32m 18s`
  - `≤ 1m`: `0m 18s`

**Acceptance flow.**
- Today acceptance flows through `notifyQuoteEvent({ token, event: 'accepted', signatureText })` (called from `PublicQuote.tsx`). The server side of that — likely the `quote-notify` edge function — updates `public_quotes` (status, signature_text, accepted_at) and presumably emails the painter.
- The same handler recomputes `now() < discount_expires_at` server-side at the moment of the call.
  - If still valid: stamp the discounted total onto the public_quotes row in a new `accepted_total` column (added in the same migration).
  - If somehow expired (clock skew/race): stamp the full total. Return the actual accepted amount in the response so the UI can reconcile if it diverges from what the customer was looking at.
- The decision moment is the click — a customer who clicks Accept at 11:58 PM with a midnight expiration locks in the discount even if signing finishes at 12:01 AM.

**Time zone story.**
- Server stores `discount_expires_at` as `timestamptz` (UTC under the hood).
- Painter UI picks expiration in their local time.
- Customer countdown computed against the customer browser's local clock; they see "expires in 2d 14h" regardless of where they are.

## Edge Cases

| Case | Behavior |
|---|---|
| Painter sets expiration in the past | Client blocks; server rejects 400 |
| Painter sets fixed discount > bid total | Server rejects 400 |
| Customer opens already-expired quote | Banner renders expired state immediately; no discount line; total = original |
| Customer on page when timer hits zero | Banner flips, line removes, no reload |
| Customer accepts at moment of expiration | Server arbitrates; the click is the decision moment |
| Customer's clock is wrong | Doesn't matter; server validates at acceptance |
| Quote re-sent (new public_token) | Each `public_quotes` row carries own discount; old quote unaffected |
| Org downgrades Pro → Basic with active discounted quotes | Existing quotes honored as-sent; can't create new discounted quotes |

## Testing Plan

**Unit (vitest):**
- Discount math (percent + fixed)
- Countdown format function across all ranges
- Time-zone-correct expiration comparison

**Integration:**
- send-quote edge function: valid + invalid discount payloads, Pro-tier check
- Acceptance endpoint: recompute `now() < discount_expires_at` at acceptance time

**Manual on coatcalc.com:**
1. Send a quote with 10% discount expiring in 5 minutes. Watch countdown tick down on public page in incognito.
2. Wait for expiration; verify banner flips and total reverts.
3. Send another quote with 1-hour expiration, accept immediately as customer; verify acceptance row stores discounted total.
4. Painter timezone PST, customer browser EST; verify deadline shown correctly to both.

## Out of Scope (parking lot for v1.5+)

- Painter "Extend offer" action on already-sent quotes
- Org-wide promotional campaigns
- Multiple concurrent discounts (BOGO, tiered)
- Customer-side "lock in this price now" deposit (the natural integration point with the upcoming customer-payments feature)
- Email reminder when discount is about to expire

## Affected Files (anticipated — planner will refine)

- `supabase/migrations/010_quote_discount.sql` (new)
- `src/pages/PublicQuote.tsx` (banner + line item rendering)
- `src/utils/discount.ts` (new — discount math + countdown format helpers)
- New countdown banner component (location: planner picks — likely `src/components/` somewhere; no existing `src/components/quote/` directory)
- The Send Quote modal (planner identifies the existing component file; gets a new collapsible discount section)
- `supabase/functions/send-quote/index.ts` (accept + validate discount fields, gate by Pro tier)
- `supabase/functions/quote-notify/index.ts` (recompute discount validity at acceptance, stamp `accepted_total`)
- `src/services/quoteService.ts` or similar (typed payloads for the new fields)
- `src/pages/SavedBids.tsx` (badge on discounted quotes in the sent quotes list)
