# Public Quote Phase 4 — Polish

**Date:** 2026-04-13
**Status:** Approved
**Summary:** Mobile responsive refinement, success modal with copy link, resend/copy link on Saved Bids, expired quote date display, dropdown tab navigation on mobile.

---

## 1. Mobile Tab Navigation (Dropdown)

On screens under 480px, the scrollable tab bar in the public quote page header is replaced with a dropdown button showing the active tab name and a chevron. Tapping opens a menu overlay listing all enabled pages. Selecting a page closes the menu and switches the tab.

On desktop (>= 480px), the current horizontal scrollable tab bar remains unchanged.

Implementation: a `<style>` block with `@media (max-width: 479px)` hides the tab bar and shows the dropdown. A small `useState` controls the dropdown open/close. The dropdown renders as a positioned overlay below the header.

## 2. Responsive Page Templates

A `<style>` block added to `PublicQuote.tsx` with CSS media queries for `max-width: 479px`:

- **Services grid**: `grid-template-columns` overridden to `1fr` (single column)
- **Gallery before/after**: keep side-by-side but reduce image height from 180px to 120px
- **Stats grid**: max 2 columns instead of 3
- **General**: reduce card padding from 24px to 16px, reduce heading font sizes slightly
- **Testimonials, Process, About Us, Terms**: already single-column, minor padding/spacing adjustments only

Each template's top-level container gets a CSS class name (e.g., `quote-services`, `quote-gallery`) so the media queries can target them. The inline `style` attributes handle desktop; CSS overrides handle mobile via `!important` on the grid properties.

## 3. Success Modal (replaces alert)

New component: `src/components/quotes/QuoteSentModal.tsx`

Props: `quoteUrl: string`, `onClose: () => void`

Content:
- Green checkmark icon
- "Estimate Sent!" heading
- "Your estimate has been emailed to the customer." subtitle
- Quote URL displayed in a truncated input-style box
- "Copy Link" button — uses `navigator.clipboard.writeText(url)`, shows "Copied!" for 2 seconds
- "Preview" button — opens `quoteUrl` in a new tab via `window.open()`
- "Done" button — calls `onClose()`

Replaces the current `alert()` in `SavedBids.tsx` `onSent` callback.

## 4. Resend + Copy Link on Saved Bids

For bids that have a sent quote, the action buttons row shows:
- **Resend** — one-click, calls `sendQuote()` with the same parameters (reads from the existing `PublicQuote` record in `quoteMap`). On success, shows inline "Resent!" text that fades after 2 seconds. On failure, shows inline "Failed" in red.
- **Copy Link** — copies the public quote URL (`window.location.origin + '/quote/' + quote.publicToken`) to clipboard. Shows inline "Copied!" for 2 seconds.

Both appear alongside the existing Clone and Delete buttons. The existing "Send" button (for unsent bids) remains unchanged.

## 5. Expired Quote Date Display

The public page already shows an "Estimate Expired" card for expired quotes (implemented in Phase 1). Update the message to include the specific expiration date:

"This estimate expired on {format(expiresAt, 'MMM d, yyyy')}. Please contact {companyName} for an updated quote."

This is a one-line change in `PublicQuote.tsx`.
