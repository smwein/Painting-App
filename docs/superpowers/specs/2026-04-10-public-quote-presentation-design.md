# Public Quote Presentation System

**Date:** 2026-04-10
**Status:** Draft
**Summary:** Customer-facing shareable quote pages with branded multi-page presentations, type-to-sign acceptance, email delivery, and activity tracking.

---

## Overview

Transform the current PDF-download quote flow into a shareable web-based presentation. Estimators send an email with a link; customers view a branded, multi-page quote in their browser and accept with a typed signature. Estimators get notifications when quotes are viewed or accepted.

## Customer Experience

1. Customer receives email: "You have a new estimate from [Company Name]"
2. Clicks "View Your Estimate" button in the email
3. Opens `/quote/:token` — a public page, no login required
4. Sees a tabbed presentation: Estimate, About Us, Services, Testimonials, Gallery, Our Process, Terms
5. Reviews line items and total on the Estimate tab
6. Clicks "Accept Estimate" — modal appears
7. Types their name as a signature (rendered in signature font)
8. Confirms — estimator gets notified, status updates to "Accepted"

## Visual Design

Card-based layout with bold total banner (Option B from brainstorming):

- **Header:** White background, company logo + name + contact info on left, tab navigation on right. Blue accent underline on active tab.
- **Content area:** Light gray (`#f8fafc`) background. Content in white rounded cards with subtle shadows.
- **Estimate tab:** Customer info card (name, address), line items list (description left, amount right-aligned), then a bold blue (`#2563eb` default, configurable) banner showing the project total with white "Accept Estimate" button.
- **Other tabs:** Fixed templates rendered with the org's content from presentation settings.
- **Mobile responsive:** Single-column layout, tabs become a horizontal scrollable bar.
- **Brand color:** Configurable per org. Used for header accent, active tab indicator, total banner, and accept button.

## Data Model

### New table: `public_quotes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `bid_id` | UUID | FK to bids |
| `public_token` | text, unique | Short random token for URL (8 chars, e.g. `a8f3kx9m`) |
| `customer_email` | text | Recipient email |
| `customer_name` | text | From bid customer info |
| `status` | text | `sent`, `viewed`, `accepted`, `declined`, `expired` |
| `enabled_pages` | text[] | Which presentation pages are included |
| `accepted_at` | timestamptz | When customer accepted |
| `signature_text` | text | Typed signature name |
| `viewed_at` | timestamptz | First view timestamp |
| `view_count` | int, default 0 | Total view count |
| `expires_at` | timestamptz | Quote expiration (default 30 days from send) |
| `sent_by` | UUID | FK to auth.users — who sent it |
| `created_at` | timestamptz | When sent |

**RLS Policies:**
- Public SELECT by token (no auth required, filtered to specific token) — for reading quote data on the public page
- No public UPDATE — all status changes (viewed, accepted) go through the `quote-notify` edge function server-side for security
- Authenticated SELECT/INSERT/UPDATE for org members

### Modified table: `bids`

Add column:
- `locked` | boolean, default false | Set to true when a public quote is sent

### New fields in `pricing_settings` JSONB

```typescript
interface PresentationSettings {
  brandColor: string; // hex color, default '#2563eb'
  defaultPages: string[]; // pages enabled by default when sending

  aboutUs: {
    heading: string;
    bodyText: string;
    imageUrl?: string;
    stats: Array<{ label: string; value: string }>;
  };

  services: {
    items: Array<{
      name: string;
      description: string;
      imageUrl?: string;
    }>;
  };

  testimonials: {
    items: Array<{
      name: string;
      quote: string;
      rating: number; // 1-5
      photoUrl?: string;
    }>;
  };

  gallery: {
    items: Array<{
      projectName: string;
      beforeUrl?: string;
      afterUrl?: string;
      description: string;
    }>;
  };

  process: {
    steps: Array<{
      name: string;
      description: string;
    }>;
  };

  terms: {
    content: string; // plain text or markdown
  };
}
```

### Supabase Storage

New public bucket: `quote-assets`
- Stores images uploaded in the presentation builder (about us photo, service images, testimonial photos, gallery before/after photos)
- Public read access (images must be viewable on the unauthenticated quote page)
- Authenticated write access for org members
- Path structure: `{organization_id}/{page_type}/{filename}`

## Presentation Page Templates

All pages use a fixed layout template. Estimators fill in content in settings. Pages can be enabled/disabled per quote.

### 1. Estimate (always on)
- Customer name and address
- Job date (if set)
- Line items derived from bid data based on calculator type:
  - **Detailed calcs:** Section-level summaries (e.g. "Interior Painting — Walls", "Prep Work — Drywall Repair") using the same logic as the existing customer PDF
  - **Simple sqft calcs:** Single line per pricing option (e.g. "Interior Painting — Complete")
  - **Per-room:** One line per room (e.g. "Master Bedroom", "Kitchen")
- Project total only — no labor/material/profit breakdown visible to customer
- "Accept Estimate" button at bottom

### 2. About Us
- Heading (e.g. "About Premier Painting")
- Body text (company story)
- Optional company/team photo
- Stats row (e.g. "15 Years Experience", "500+ Projects", "Licensed & Insured")

### 3. Services
- Grid of service cards (2 columns desktop, 1 column mobile)
- Each card: service name, description, optional image
- Shows breadth of services beyond this specific quote

### 4. Testimonials
- Cards with quote text, reviewer name, star rating
- Optional reviewer photo
- 1-2 column layout

### 5. Project Gallery
- Grid of project cards
- Each card: project name, before/after images side by side, description
- Demonstrates quality of past work

### 6. Our Process
- Numbered steps (1, 2, 3, 4, 5)
- Each step: name and description
- Visual timeline/list layout

### 7. Terms & Conditions
- Full-width text content
- Payment terms, warranty, cancellation policy, liability
- Plain text rendered with paragraph formatting

## Quote Sending Flow

### Entry Points

1. **Calculator page** — new "Send to Customer" button alongside existing export buttons. Bid must be saved first.
2. **Saved Bids page** — "Send" action on each bid row. Already-sent bids show status badge instead.

### Send Modal

Fields:
- Customer email (pre-filled from bid customer info)
- Customer name (pre-filled)
- Page selection — checkboxes for each presentation page, pre-filled with org default pages
- Expiration — date picker, defaults to 30 days from now
- Preview button — opens a local preview of the quote page in a new tab (renders the bid data + selected pages without creating a public_quotes record)

Actions:
- "Send Estimate" — creates public_quotes record, locks the bid, sends email, shows success toast with copyable link
- Cancel

### Email Template

Sent via Resend (new Supabase edge function: `send-quote`).

Content:
- Company logo (from settings)
- "You have a new estimate from [Company Name]"
- Customer name greeting
- Estimate total amount
- "View Your Estimate" CTA button linking to `/quote/:token`
- Company contact info in footer

## Accept Flow

1. Customer clicks "Accept Estimate" on the quote page
2. Modal appears: "Accept This Estimate"
3. Customer types their full name in a text input
4. Name renders below in a signature font (e.g. `Dancing Script` or `Great Vibes` from Google Fonts) as a preview
5. Customer clicks "Confirm & Accept"
6. Public quote status updates to `accepted`, `accepted_at` and `signature_text` are saved
7. Success message: "Thank you! Your estimate has been accepted. [Company Name] will be in touch."
8. Estimator receives email notification: "[Customer Name] accepted your estimate for [Address]"

## Bid Locking

- When a public quote is sent, the bid's `locked` field is set to `true`
- Locked bids display a lock icon in the Saved Bids list and on the Calculator page
- All inputs are disabled when viewing a locked bid
- "Unlock to Edit" button appears on locked bids
- Clicking unlock shows a warning: "This quote has been sent to the customer. Changes will be visible to them immediately."
- Confirming unlocks the bid for editing
- No automatic re-lock — estimator can manually re-lock or it stays unlocked

## Activity Tracking & Notifications

### Tracking

- **First view:** When the public quote page loads for the first time, set `viewed_at` and update status to `viewed`
- **View count:** Increment `view_count` on every page load
- **Acceptance:** Set `accepted_at`, `signature_text`, update status to `accepted`
- **Decline:** (Future — no decline button in Phase 1, just expiration)

### Notifications (Email via Resend)

- **Quote viewed** (first view only): "[Customer Name] viewed your estimate for [Address]"
- **Quote accepted:** "[Customer Name] accepted your estimate for [Address]"
- **Quote declined:** (Future)

### In-App

- **Saved Bids page:** Status badges on each bid row — Draft, Sent, Viewed, Accepted, Expired
- **Filtering:** Filter saved bids by status
- **Activity column:** Shows last activity (e.g. "Viewed 2h ago", "Accepted Apr 10")

## Routing

### New public route
- `/quote/:token` — Public quote view page (no auth required)

### Modified protected routes
- Settings page — new "Presentation" tab
- Calculator page — "Send to Customer" button
- Saved Bids page — status badges, send action, activity info

## New Supabase Edge Functions

### `send-quote`
- Input: `{ bidId, customerEmail, customerName, enabledPages, expiresAt, organizationId, sentBy }`
- Generates public token
- Creates `public_quotes` record
- Sets bid `locked = true`
- Sends email via Resend with quote link
- Returns `{ publicToken, quoteUrl }`

### `quote-notify`
- Called from the public quote page when status changes (viewed, accepted)
- Input: `{ token, event: 'viewed' | 'accepted', signatureText? }`
- Updates `public_quotes` record
- Sends notification email to the estimator who sent the quote
- Returns `{ success: true }`

## Build Phases

### Phase 1 — Public Quote View + Sending
- Supabase migration: `public_quotes` table, `locked` column on bids, RLS policies
- Public `/quote/:token` route — estimate page only (no presentation tabs yet)
- Card-based layout with brand color from settings
- Type-to-sign accept flow
- Send modal on Calculator and Saved Bids pages
- `send-quote` edge function + email template
- Basic status tracking (sent → viewed → accepted)
- Bid locking/unlocking

### Phase 2 — Presentation Builder + Pages
- `PresentationSettings` type added to settings
- Supabase Storage bucket `quote-assets` for image uploads
- New "Presentation" tab in Settings with all 6 page content editors
- Tab navigation on public quote view
- Render all page templates: About Us, Services, Testimonials, Gallery, Process, Terms
- Default page selection per org
- Per-quote page selection in send modal

### Phase 3 — Notifications + Activity Tracking
- `quote-notify` edge function
- View tracking (first view sets `viewed_at`, increments `view_count`)
- Email notifications to estimator (viewed, accepted)
- Status badges on Saved Bids page (Draft, Sent, Viewed, Accepted, Expired)
- Activity info on bid rows (last activity timestamp)
- Filter saved bids by status

### Phase 4 — Polish
- Mobile responsive refinement for all page templates
- Quote expiration check + expired state UI
- Preview before sending
- Copy link button on success toast and saved bids
- Resend quote option (sends another email for same public quote)
- Bid lock icon and unlock warning UX refinement
