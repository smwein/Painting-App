# Public Quote Phase 4 — Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the public quote system with mobile responsive design, success modal, resend/copy link actions, and expired date display.

**Architecture:** Five independent UI changes across two files (`PublicQuote.tsx`, `SavedBids.tsx`) plus one new component (`QuoteSentModal.tsx`). CSS media queries handle mobile; no new dependencies.

**Tech Stack:** React, TypeScript, Tailwind CSS, date-fns (already installed)

---

### Task 1: Expired Quote Date Display

**Files:**
- Modify: `src/pages/PublicQuote.tsx:168-181` (expired error block)

- [ ] **Step 1: Update expired message to show date**

In `src/pages/PublicQuote.tsx`, find the expired quote block (line 168-181). Replace the paragraph text to include the formatted expiration date.

Change:
```tsx
<p style={{ color: '#64748b', fontSize: 15, margin: '0 0 24px' }}>
  This estimate has expired. Please contact {data.companyName} for an updated quote.
</p>
```

To:
```tsx
<p style={{ color: '#64748b', fontSize: 15, margin: '0 0 24px' }}>
  This estimate expired on {new Date(data.quote.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Please contact {data.companyName} for an updated quote.
</p>
```

Note: `date-fns` `format` is not imported in this file and the file uses native Date methods elsewhere. Use `toLocaleDateString` for consistency. The data is already available — `data.quote.expiresAt` is loaded even for expired quotes (see lines 73-91).

- [ ] **Step 2: Verify locally**

Run: `npm run dev`
Navigate to an expired quote URL. Confirm the message shows "This estimate expired on Mar 15, 2026" (or whatever the actual date is) instead of the generic message.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PublicQuote.tsx
git commit -m "feat: show expiration date on expired quote page"
```

---

### Task 2: QuoteSentModal Component

**Files:**
- Create: `src/components/quotes/QuoteSentModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `src/components/quotes/QuoteSentModal.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '../common/Button';

interface QuoteSentModalProps {
  quoteUrl: string;
  onClose: () => void;
}

export function QuoteSentModal({ quoteUrl, onClose }: QuoteSentModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = quoteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
        {/* Green checkmark */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Estimate Sent!</h2>
        <p className="text-sm text-gray-500 mb-5">Your estimate has been emailed to the customer.</p>

        {/* Quote URL display */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate text-left">
            {quoteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(quoteUrl, '_blank')}
            className="flex-1"
          >
            Preview
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/quotes/QuoteSentModal.tsx
git commit -m "feat: add QuoteSentModal component"
```

---

### Task 3: Wire Up QuoteSentModal in SavedBids

**Files:**
- Modify: `src/pages/SavedBids.tsx:1-9` (imports)
- Modify: `src/pages/SavedBids.tsx:40` (state)
- Modify: `src/pages/SavedBids.tsx:268-286` (SendQuoteModal onSent + new modal render)

- [ ] **Step 1: Add import and state**

In `src/pages/SavedBids.tsx`, add the import alongside the existing `SendQuoteModal` import (line 7):

```tsx
import { QuoteSentModal } from '../components/quotes/QuoteSentModal';
```

Add state for the success modal URL after line 40 (`sendModalBid` state):

```tsx
const [sentQuoteUrl, setSentQuoteUrl] = useState<string | null>(null);
```

- [ ] **Step 2: Replace alert() with modal**

In the `onSent` callback (lines 275-283), replace `alert()` with setting the modal state:

Change:
```tsx
onSent={(url) => {
  setSendModalBid(null);
  alert(`Estimate sent! Link: ${url}`);
  // Refresh quote statuses
  fetchQuotesForOrg(user.organizationId!).then((quotes) => {
    const map = new Map<string, PublicQuote>();
    quotes.forEach((q) => map.set(q.bidId, q));
    setQuoteMap(map);
  }).catch(console.error);
}}
```

To:
```tsx
onSent={(url) => {
  setSendModalBid(null);
  setSentQuoteUrl(url);
  // Refresh quote statuses
  fetchQuotesForOrg(user.organizationId!).then((quotes) => {
    const map = new Map<string, PublicQuote>();
    quotes.forEach((q) => map.set(q.bidId, q));
    setQuoteMap(map);
  }).catch(console.error);
}}
```

- [ ] **Step 3: Render the QuoteSentModal**

After the `SendQuoteModal` closing tag (after line 286), add:

```tsx
{sentQuoteUrl && (
  <QuoteSentModal
    quoteUrl={sentQuoteUrl}
    onClose={() => setSentQuoteUrl(null)}
  />
)}
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`
Send an estimate from the Saved Bids page. Confirm:
- The green checkmark modal appears (not `alert()`)
- The quote URL is displayed and truncated
- "Copy Link" copies to clipboard and shows "Copied!" for 2 seconds
- "Preview" opens the quote in a new tab
- "Done" closes the modal

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat: replace alert with QuoteSentModal on send"
```

---

### Task 4: Resend + Copy Link Buttons on Saved Bids

**Files:**
- Modify: `src/pages/SavedBids.tsx:30-40` (state)
- Modify: `src/pages/SavedBids.tsx:234-245` (action buttons area)

- [ ] **Step 1: Add state and imports**

Add `sendQuote` to the existing import from quoteService (line 8):

```tsx
import { fetchQuotesForOrg, sendQuote } from '../services/quoteService';
```

Add state for inline feedback after the existing state declarations:

```tsx
const [resendingBidId, setResendingBidId] = useState<string | null>(null);
const [resendFeedback, setResendFeedback] = useState<{ bidId: string; type: 'success' | 'error' } | null>(null);
const [copiedBidId, setCopiedBidId] = useState<string | null>(null);
```

- [ ] **Step 2: Add resend and copy handler functions**

Add these functions inside the `SavedBids` component, before the return statement (before the `return (` around line 100):

```tsx
const handleResend = async (e: React.MouseEvent, bid: typeof allBids[0]) => {
  e.stopPropagation();
  const quote = quoteMap.get(bid.id);
  if (!quote || !user?.organizationId) return;

  setResendingBidId(bid.id);
  setResendFeedback(null);
  try {
    await sendQuote({
      bidId: bid.id,
      customerEmail: quote.customerEmail,
      customerName: quote.customerName,
      enabledPages: quote.enabledPages,
      expiresAt: quote.expiresAt,
      organizationId: user.organizationId,
    });
    setResendFeedback({ bidId: bid.id, type: 'success' });
    // Refresh quote statuses
    fetchQuotesForOrg(user.organizationId).then((quotes) => {
      const map = new Map<string, PublicQuote>();
      quotes.forEach((q) => map.set(q.bidId, q));
      setQuoteMap(map);
    }).catch(console.error);
  } catch {
    setResendFeedback({ bidId: bid.id, type: 'error' });
  } finally {
    setResendingBidId(null);
    setTimeout(() => setResendFeedback(null), 2000);
  }
};

const handleCopyLink = async (e: React.MouseEvent, bidId: string) => {
  e.stopPropagation();
  const quote = quoteMap.get(bidId);
  if (!quote) return;

  const url = `${window.location.origin}/quote/${quote.publicToken}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
  setCopiedBidId(bidId);
  setTimeout(() => setCopiedBidId(null), 2000);
};
```

- [ ] **Step 3: Add Resend and Copy Link buttons for sent bids**

In the action buttons area (around line 234-245), the current code shows the "Send" button only when `!quoteMap.has(bid.id)`. Add an `else` branch for bids that DO have a quote. Replace this block:

```tsx
{!quoteMap.has(bid.id) && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setSendModalBid({ id: bid.id, name: bid.customerName, email: '' });
    }}
    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
  >
    Send
  </button>
)}
```

With:

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
  <>
    <button
      onClick={(e) => handleResend(e, bid)}
      disabled={resendingBidId === bid.id}
      className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
    >
      {resendingBidId === bid.id
        ? 'Sending...'
        : resendFeedback?.bidId === bid.id
          ? resendFeedback.type === 'success'
            ? 'Resent!'
            : 'Failed'
          : 'Resend'}
    </button>
    <button
      onClick={(e) => handleCopyLink(e, bid.id)}
      className="text-sm text-teal-600 hover:text-teal-700 font-medium"
    >
      {copiedBidId === bid.id ? 'Copied!' : 'Copy Link'}
    </button>
  </>
)}
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`
On the Saved Bids page, for a bid that has been sent:
- Confirm "Resend" and "Copy Link" buttons appear (instead of "Send")
- Click "Copy Link" — confirm clipboard has the URL, button shows "Copied!" for 2s
- Click "Resend" — confirm it shows "Sending..." then "Resent!" for 2s
- For a bid that has NOT been sent, confirm "Send" button still appears

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat: add Resend and Copy Link buttons for sent quotes"
```

---

### Task 5: Mobile Tab Dropdown Navigation

**Files:**
- Modify: `src/pages/PublicQuote.tsx:46-55` (state)
- Modify: `src/pages/PublicQuote.tsx:229-255` (tab bar)

- [ ] **Step 1: Add dropdown state**

In `PublicQuote.tsx`, add state for the mobile dropdown after the existing `activeTab` state (line 55):

```tsx
const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
```

- [ ] **Step 2: Replace tab bar with responsive version**

Replace the tab bar section (lines 229-255, the `{tabs.length > 1 ? (` block through its closing) with:

```tsx
{tabs.length > 1 ? (
  <>
    {/* Desktop: horizontal tabs */}
    <div className="quote-tabs-desktop" style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? brandColor : '#64748b',
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${activeTab === tab ? brandColor : 'transparent'}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {TAB_LABELS[tab] || tab}
        </button>
      ))}
    </div>
    {/* Mobile: dropdown */}
    <div className="quote-tabs-mobile" style={{ position: 'relative', display: 'none' }}>
      <button
        onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 600,
          color: brandColor,
          background: 'none',
          border: `1px solid ${brandColor}`,
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        {TAB_LABELS[activeTab] || activeTab}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: tabDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {tabDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          background: 'white',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0',
          zIndex: 40,
          minWidth: 160,
          overflow: 'hidden',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setTabDropdownOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? brandColor : '#475569',
                background: activeTab === tab ? '#f8fafc' : 'white',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {TAB_LABELS[tab] || tab}
            </button>
          ))}
        </div>
      )}
    </div>
  </>
) : (
  <div style={{ fontSize: 13, fontWeight: 500, color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: 2 }}>
    Estimate
  </div>
)}
```

- [ ] **Step 3: Add responsive CSS**

At the bottom of `PublicQuote.tsx`, right before the closing `</div>` of the root element (before line 396), after the Google Fonts `<link>` tag, add:

```tsx
<style>{`
  @media (max-width: 479px) {
    .quote-tabs-desktop { display: none !important; }
    .quote-tabs-mobile { display: block !important; }
  }
`}</style>
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`
Open a public quote URL with multiple pages enabled:
- Desktop (>= 480px): horizontal tab bar as before
- Mobile (< 480px, use browser devtools): dropdown button showing active tab name with chevron
- Click dropdown: menu overlay lists all pages
- Select a page: menu closes, tab switches

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicQuote.tsx
git commit -m "feat: add mobile dropdown navigation for quote tabs"
```

---

### Task 6: Responsive Page Templates

**Files:**
- Modify: `src/pages/PublicQuote.tsx` (add CSS class names to template containers + media query styles)
- Modify: `src/components/quote-pages/ServicesPage.tsx` (add class name)
- Modify: `src/components/quote-pages/GalleryPage.tsx` (add class name)

- [ ] **Step 1: Check current page template structures**

Read these files to identify the grid/layout containers that need class names:
- `src/components/quote-pages/ServicesPage.tsx` — find the grid container
- `src/components/quote-pages/GalleryPage.tsx` — find the image grid/containers

- [ ] **Step 2: Add CSS class names to page template containers**

In `ServicesPage.tsx`, find the services grid container (likely a `div` with `display: 'grid'` and `gridTemplateColumns`). Add `className="quote-services-grid"` to it.

In `GalleryPage.tsx`, find the before/after image containers. Add `className="quote-gallery-pair"` to the side-by-side image containers. Also find any stats grid and add `className="quote-stats-grid"`.

In `PublicQuote.tsx`, the main content area (`<main>`) already has `style={{ maxWidth: 640, ... }}`. The estimate tab content cards at lines 260-318 don't need class names — they're already single-column.

- [ ] **Step 3: Add responsive media queries**

Extend the `<style>` tag added in Task 5 (the one at the bottom of `PublicQuote.tsx`) to include page template overrides. Replace the existing `<style>` tag with:

```tsx
<style>{`
  @media (max-width: 479px) {
    .quote-tabs-desktop { display: none !important; }
    .quote-tabs-mobile { display: block !important; }
    .quote-services-grid { grid-template-columns: 1fr !important; }
    .quote-gallery-pair img { max-height: 120px !important; }
    .quote-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    main { padding: 16px 12px !important; }
    main > div { padding: 16px !important; }
  }
`}</style>
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`
Open a public quote with services, gallery, and stats pages enabled:
- Desktop: grids render as before (2-3 columns)
- Mobile (< 480px): services are single column, gallery images shorter, stats 2-col, reduced padding

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicQuote.tsx src/components/quote-pages/ServicesPage.tsx src/components/quote-pages/GalleryPage.tsx
git commit -m "feat: add responsive CSS for mobile quote page templates"
```

---

### Task 7: Build Verification & Push

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: successful build with no errors

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

This triggers auto-deploy to DigitalOcean App Platform (www.coatcalc.com).
