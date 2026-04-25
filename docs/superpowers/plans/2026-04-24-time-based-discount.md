# Time-Based Discount with Countdown Banner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro-tier feature: when sending a quote, the painter can attach a limited-time discount (% or fixed $) with a hard expiration. The customer's public quote page shows a countdown banner and an itemized discount line; on expiration the banner flips to "expired" and the total reverts to original. Server is the source of truth at acceptance time.

**Architecture:** Single migration extending `public_quotes` with `discount_type`, `discount_value`, `discount_expires_at`, `accepted_total`. Painter UI lives inside the existing `SendQuoteModal`, gated by `isProTier`. Customer UI is a new `CountdownBanner` plus a discount line in `PublicQuote.tsx`. Send-time validation in `send-quote` edge fn; acceptance-time validation in `quote-notify` (stamps `accepted_total`).

**Tech Stack:** React + TypeScript, Vite, Tailwind, Supabase Postgres, Supabase Edge Functions (Deno), vitest.

**Spec:** `docs/superpowers/specs/2026-04-24-time-based-discount-design.md`

---

## File Map

**Create:**
- `supabase/migrations/010_quote_discount.sql`
- `src/utils/discount.ts` — discount math + countdown formatting (pure)
- `src/utils/discount.test.ts` — vitest unit tests for discount.ts
- `src/components/quotes/CountdownBanner.tsx` — banner with live tick-down
- `vitest.config.ts` — only if it doesn't already exist (check first)

**Modify:**
- `src/types/quote.types.ts` — extend `PublicQuote` with discount fields + `acceptedTotal`
- `src/services/quoteService.ts` — extend `sendQuote()` payload + `mapRow()`
- `src/components/quotes/SendQuoteModal.tsx` — collapsible discount section, gated by `isProTier`
- `supabase/functions/send-quote/index.ts` — accept + validate discount fields, gate by Pro tier server-side, persist
- `supabase/functions/quote-notify/index.ts` — at accept event, recompute `now() < discount_expires_at` and stamp `accepted_total`
- `src/pages/PublicQuote.tsx` — render `CountdownBanner` + insert discount line item in totals
- `src/pages/SavedBids.tsx` — badge on quotes with active/expired discounts

---

## Task 1: Migration — extend public_quotes

**Files:**
- Create: `supabase/migrations/010_quote_discount.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 010_quote_discount.sql
-- Pro feature: limited-time discount on a sent quote.
-- All-or-nothing on the discount triple; accepted_total stamped at acceptance.

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

- [ ] **Step 2: Apply via Supabase SQL editor**

Open https://supabase.com/dashboard/project/hbranokmkritcdzozjli/sql/new, paste the migration, run it. Verify no errors. Confirm with:

```sql
\d public_quotes
```

Expected: four new columns visible — `discount_type`, `discount_value`, `discount_expires_at`, `accepted_total`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_quote_discount.sql
git commit -m "feat(db): add discount + accepted_total columns to public_quotes"
```

---

## Task 2: Discount utility — pure logic with TDD

**Files:**
- Create: `src/utils/discount.ts`
- Create: `src/utils/discount.test.ts`

- [ ] **Step 1: Verify vitest is wired up**

Run: `npx vitest --run --reporter=basic 2>&1 | head -5`

If you see "No test files found" or similar with no error, vitest is configured. If you see a config error, create `vitest.config.ts` at project root:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
```

- [ ] **Step 2: Write failing tests**

Create `src/utils/discount.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyDiscount, formatCountdown, isDiscountActive } from './discount';

describe('applyDiscount', () => {
  it('applies a percentage discount', () => {
    expect(applyDiscount(10000, { type: 'percent', value: 10 })).toEqual({
      discountAmount: 1000,
      finalTotal: 9000,
    });
  });

  it('applies a fixed-dollar discount', () => {
    expect(applyDiscount(10000, { type: 'fixed', value: 500 })).toEqual({
      discountAmount: 500,
      finalTotal: 9500,
    });
  });

  it('rounds percentage discount to cents', () => {
    expect(applyDiscount(99.99, { type: 'percent', value: 10 })).toEqual({
      discountAmount: 10.00,
      finalTotal: 89.99,
    });
  });

  it('caps fixed discount at the subtotal (never negative total)', () => {
    expect(applyDiscount(100, { type: 'fixed', value: 500 })).toEqual({
      discountAmount: 100,
      finalTotal: 0,
    });
  });

  it('returns zero discount for null discount config', () => {
    expect(applyDiscount(10000, null)).toEqual({
      discountAmount: 0,
      finalTotal: 10000,
    });
  });
});

describe('isDiscountActive', () => {
  it('returns true when expiry is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isDiscountActive(future)).toBe(true);
  });

  it('returns false when expiry is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isDiscountActive(past)).toBe(false);
  });

  it('returns false when expiry is null', () => {
    expect(isDiscountActive(null)).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('returns 0m 0s when remaining ms is zero or negative', () => {
    expect(formatCountdown(0)).toBe('0m 0s');
    expect(formatCountdown(-1000)).toBe('0m 0s');
  });

  it('formats seconds-only when less than a minute', () => {
    expect(formatCountdown(45_000)).toBe('0m 45s');
  });

  it('formats minutes and seconds when less than an hour', () => {
    expect(formatCountdown(32 * 60_000 + 18_000)).toBe('32m 18s');
  });

  it('formats hours, minutes, and seconds when less than a day', () => {
    expect(formatCountdown(4 * 3_600_000 + 32 * 60_000 + 18_000)).toBe('4h 32m 18s');
  });

  it('formats days, hours, and minutes when more than a day', () => {
    expect(formatCountdown(2 * 86_400_000 + 14 * 3_600_000 + 32 * 60_000)).toBe('2d 14h 32m');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest --run src/utils/discount.test.ts`
Expected: FAIL with "Cannot find module './discount'" or equivalent.

- [ ] **Step 4: Implement `src/utils/discount.ts`**

```ts
export type DiscountType = 'percent' | 'fixed';

export interface DiscountConfig {
  type: DiscountType;
  value: number;
}

export interface DiscountResult {
  discountAmount: number;
  finalTotal: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function applyDiscount(subtotal: number, config: DiscountConfig | null): DiscountResult {
  if (!config) return { discountAmount: 0, finalTotal: subtotal };

  let raw = config.type === 'percent'
    ? subtotal * (config.value / 100)
    : config.value;

  const discountAmount = round2(Math.min(raw, subtotal));
  const finalTotal = round2(subtotal - discountAmount);
  return { discountAmount, finalTotal };
}

export function isDiscountActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0m 0s';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest --run src/utils/discount.test.ts`
Expected: PASS, 11 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/utils/discount.ts src/utils/discount.test.ts vitest.config.ts
git commit -m "feat: discount math and countdown format utilities"
```

(Drop `vitest.config.ts` from the add list if you didn't need to create it.)

---

## Task 3: Extend types + service layer

**Files:**
- Modify: `src/types/quote.types.ts`
- Modify: `src/services/quoteService.ts`

- [ ] **Step 1: Extend the `PublicQuote` type**

In `src/types/quote.types.ts`, replace the existing interface with:

```ts
export interface PublicQuote {
  id: string;
  organizationId: string;
  bidId: string;
  publicToken: string;
  customerEmail: string;
  customerName: string;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  enabledPages: string[];
  acceptedAt?: string;
  signatureText?: string;
  viewedAt?: string;
  viewCount: number;
  expiresAt: string;
  sentBy: string;
  createdAt: string;
  discountType?: 'percent' | 'fixed' | null;
  discountValue?: number | null;
  discountExpiresAt?: string | null;
  acceptedTotal?: number | null;
}
```

- [ ] **Step 2: Update `mapRow` and `sendQuote` in `src/services/quoteService.ts`**

In the `mapRow` function, add the new field mappings before the closing brace:

```ts
function mapRow(row: any): PublicQuote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bidId: row.bid_id,
    publicToken: row.public_token,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    enabledPages: row.enabled_pages,
    acceptedAt: row.accepted_at,
    signatureText: row.signature_text,
    viewedAt: row.viewed_at,
    viewCount: row.view_count,
    expiresAt: row.expires_at,
    sentBy: row.sent_by,
    createdAt: row.created_at,
    discountType: row.discount_type ?? null,
    discountValue: row.discount_value !== null && row.discount_value !== undefined ? Number(row.discount_value) : null,
    discountExpiresAt: row.discount_expires_at ?? null,
    acceptedTotal: row.accepted_total !== null && row.accepted_total !== undefined ? Number(row.accepted_total) : null,
  };
}
```

Then extend the `sendQuote` function signature and body:

```ts
export async function sendQuote(params: {
  bidId: string;
  customerEmail: string;
  customerName: string;
  enabledPages: string[];
  expiresAt: string;
  organizationId: string;
  discount?: {
    type: 'percent' | 'fixed';
    value: number;
    expiresAt: string;
  } | null;
}): Promise<{ publicToken: string; quoteUrl: string }> {
  const { data, error } = await supabase.functions.invoke('send-quote', {
    body: params,
  });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/quote.types.ts src/services/quoteService.ts
git commit -m "feat: extend PublicQuote type and sendQuote payload with discount fields"
```

---

## Task 4: Painter UI — discount section in SendQuoteModal

**Files:**
- Modify: `src/components/quotes/SendQuoteModal.tsx`

- [ ] **Step 1: Replace the file**

Full replacement (small file, easier to read end-to-end). Replace the entire contents of `src/components/quotes/SendQuoteModal.tsx` with:

```tsx
import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { sendQuote } from '../../services/quoteService';
import { useSettingsStore } from '../../store/settingsStore';
import { useOrganizationContext } from '../../context/OrganizationContext';

interface SendQuoteModalProps {
  bidId: string;
  customerName: string;
  customerEmail: string;
  organizationId: string;
  bidTotal: number;
  onClose: () => void;
  onSent: (quoteUrl: string) => void;
}

function defaultDiscountExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return toLocalInputValue(d);
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SendQuoteModal({
  bidId,
  customerName,
  customerEmail,
  organizationId,
  bidTotal,
  onClose,
  onSent,
}: SendQuoteModalProps) {
  const { settings } = useSettingsStore();
  const { isProTier } = useOrganizationContext();
  const defaultPages = settings.pricing.presentation?.defaultPages ?? ['estimate'];

  const [email, setEmail] = useState(customerEmail);
  const [name, setName] = useState(customerName);
  const [enabledPages, setEnabledPages] = useState<string[]>(defaultPages);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [discountExpiresAt, setDiscountExpiresAt] = useState<string>(defaultDiscountExpiry());

  const ALL_PAGES: Array<{ id: string; label: string }> = [
    { id: 'about', label: 'About Us' },
    { id: 'services', label: 'Services' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'process', label: 'Our Process' },
    { id: 'terms', label: 'Terms & Conditions' },
  ];

  const togglePage = (pageId: string) => {
    setEnabledPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  const validateDiscount = (): string | null => {
    if (!discountEnabled) return null;

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return 'Discount value must be greater than zero.';
    }
    if (discountType === 'percent' && value > 90) {
      return 'Percentage discount cannot exceed 90%.';
    }
    if (discountType === 'fixed' && value >= bidTotal) {
      return 'Fixed discount must be less than the bid total.';
    }

    const expiry = new Date(discountExpiresAt);
    if (Number.isNaN(expiry.getTime())) {
      return 'Discount expiration is not a valid date.';
    }
    if (expiry.getTime() < Date.now() + 60 * 60 * 1000) {
      return 'Discount expiration must be at least 1 hour from now.';
    }

    return null;
  };

  const handleSend = async () => {
    if (!email.trim() || !name.trim()) {
      setError('Please fill in customer name and email.');
      return;
    }
    const discountError = validateDiscount();
    if (discountError) {
      setError(discountError);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const discount = discountEnabled
        ? {
            type: discountType,
            value: Number(discountValue),
            expiresAt: new Date(discountExpiresAt).toISOString(),
          }
        : null;

      const result = await sendQuote({
        bidId,
        customerEmail: email.trim(),
        customerName: name.trim(),
        enabledPages,
        expiresAt: expiresAt.toISOString(),
        organizationId,
        discount,
      });

      onSent(result.quoteUrl);
    } catch (err) {
      setError((err as Error).message || 'Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Send Estimate to Customer</h2>
        <p className="text-sm text-gray-500 mb-5">They'll receive an email with a link to view and accept the estimate.</p>

        <div className="space-y-4">
          <Input
            label="Customer Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />

          <Input
            label="Customer Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires In</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Include Pages</label>
            <p className="text-xs text-gray-500 mb-2">Estimate page is always included.</p>
            <div className="space-y-1.5">
              {ALL_PAGES.map((page) => (
                <label key={page.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={enabledPages.includes(page.id)}
                    onChange={() => togglePage(page.id)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  {page.label}
                </label>
              ))}
            </div>
          </div>

          {isProTier && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(e) => setDiscountEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                Add a limited-time discount?
              </label>

              {discountEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount type</label>
                    <div className="flex gap-3 text-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          checked={discountType === 'percent'}
                          onChange={() => setDiscountType('percent')}
                        />
                        Percentage
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          checked={discountType === 'fixed'}
                          onChange={() => setDiscountType('fixed')}
                        />
                        Fixed dollar
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {discountType === 'percent' ? 'Percentage off' : 'Dollars off'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={discountType === 'percent' ? '1' : '0.01'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder={discountType === 'percent' ? '10' : '500'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expires</label>
                    <input
                      type="datetime-local"
                      value={discountExpiresAt}
                      onChange={(e) => setDiscountExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Painter's local time. Customer sees countdown in their time zone.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} className="flex-1" disabled={sending}>
            {sending ? 'Sending...' : 'Send Estimate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Find every caller of `SendQuoteModal` and add the `bidTotal` prop**

Run: `grep -rn "SendQuoteModal" src/ --include="*.tsx" --include="*.ts"`

For each call site (excluding the component file itself), add a `bidTotal={...}` prop. The bid total is in the bid object — use the existing total field on the bid being sent. Likely the caller already has the bid in scope; if not, look up `bid.totals.total` or equivalent based on the existing structure of `Bid` type.

Verify each call site compiles. If a call site can't easily access the total, pass `0` and add a code comment `// TODO bidTotal — caller has no bid in scope` AND open a follow-up task in the parking lot. Do not block on this.

- [ ] **Step 3: Verify typecheck + build pass**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/quotes/SendQuoteModal.tsx <any-callers-modified>
git commit -m "feat(send-quote): collapsible discount section gated by Pro tier"
```

---

## Task 5: send-quote edge function — accept + validate discount

**Files:**
- Modify: `supabase/functions/send-quote/index.ts`

- [ ] **Step 1: Replace the file**

Replace `supabase/functions/send-quote/index.ts` entirely with:

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { brandedEmail } from '../_shared/emailTemplate.ts';

function generateToken(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

interface DiscountInput {
  type: 'percent' | 'fixed';
  value: number;
  expiresAt: string;
}

function validateDiscount(d: DiscountInput, bidTotal: number): string | null {
  if (d.type !== 'percent' && d.type !== 'fixed') return 'Invalid discount type';
  if (typeof d.value !== 'number' || !(d.value > 0)) return 'Discount value must be > 0';
  if (d.type === 'percent' && d.value > 90) return 'Percentage discount cannot exceed 90%';
  if (d.type === 'fixed' && d.value >= bidTotal) return 'Fixed discount must be less than bid total';
  const expiry = new Date(d.expiresAt).getTime();
  if (!Number.isFinite(expiry)) return 'Invalid discount expiration';
  if (expiry < Date.now() + 60 * 60 * 1000) return 'Discount expiration must be at least 1 hour from now';
  return null;
}

function getBidTotal(bidData: unknown): number {
  // bid_data is JSONB; total location depends on calculator type.
  // Try common shapes; fall back to 0 (validation will then fail safely for fixed discounts).
  const bd = bidData as Record<string, unknown> | null | undefined;
  if (!bd) return 0;
  const totals = bd.totals as Record<string, unknown> | undefined;
  const direct = (bd.total ?? bd.grandTotal) as number | undefined;
  const nested = (totals?.total ?? totals?.grandTotal) as number | undefined;
  return Number(nested ?? direct ?? 0) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { bidId, customerEmail, customerName, enabledPages, expiresAt, organizationId, discount } =
      await req.json();

    if (!bidId || !customerEmail || !customerName || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pro-tier gating: discount fields require an active Pro plan
    if (discount) {
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('plan_tier, plan_status')
        .eq('id', organizationId)
        .single();
      if (orgErr || !org) {
        return new Response(JSON.stringify({ error: 'Organization not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const isPro = org.plan_tier === 'pro' || org.plan_status === 'trialing';
      if (!isPro) {
        return new Response(JSON.stringify({ error: 'Discounts are a Pro feature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Pull bid total for fixed-discount validation
      const { data: bid } = await supabase
        .from('bids')
        .select('bid_data')
        .eq('id', bidId)
        .single();
      const bidTotal = getBidTotal(bid?.bid_data);

      const err = validateDiscount(discount as DiscountInput, bidTotal);
      if (err) {
        return new Response(JSON.stringify({ error: err }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const publicToken = generateToken();
    const quoteUrl = `https://www.coatcalc.com/quote/${publicToken}`;

    const insertRow: Record<string, unknown> = {
      organization_id: organizationId,
      bid_id: bidId,
      public_token: publicToken,
      customer_email: customerEmail,
      customer_name: customerName,
      enabled_pages: enabledPages ?? ['estimate'],
      expires_at: expiresAt,
      sent_by: user.id,
    };

    if (discount) {
      insertRow.discount_type = discount.type;
      insertRow.discount_value = discount.value;
      insertRow.discount_expires_at = discount.expiresAt;
    }

    const { error: insertError } = await supabase.from('public_quotes').insert(insertRow);
    if (insertError) throw insertError;

    // Lock the bid
    const { error: lockError } = await supabase
      .from('bids')
      .update({ locked: true })
      .eq('id', bidId);
    if (lockError) throw lockError;

    // Fetch org settings for company name
    const { data: settingsRow } = await supabase
      .from('pricing_settings')
      .select('settings_json')
      .eq('organization_id', organizationId)
      .single();

    const companyName = settingsRow?.settings_json?.name ?? 'Your Painting Company';

    // Build optional discount sentence
    const discountSentence = discount
      ? `\n\nThis quote includes a limited-time ${
          discount.type === 'percent' ? `${discount.value}%` : `$${discount.value}`
        } discount that expires ${new Date(discount.expiresAt).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })}.`
      : '';

    const html = brandedEmail({
      preheader: `${companyName} has sent you a painting estimate`,
      heading: `You have a new estimate from ${companyName}`,
      body: `Hi ${customerName},\n\nThank you for considering ${companyName} for your painting project. Please click below to view your estimate and accept it when you're ready.${discountSentence}`,
      ctaText: 'View Your Estimate',
      ctaUrl: quoteUrl,
    });

    await sendEmail({
      to: customerEmail,
      subject: `Your painting estimate from ${companyName}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, publicToken, quoteUrl }), {
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

Via Supabase Dashboard (Functions tab → `send-quote` → Deploy a new version → upload/paste the file), OR via CLI with a fresh access token:

```bash
SUPABASE_ACCESS_TOKEN=<fresh-token> supabase functions deploy send-quote \
  --no-verify-jwt --project-ref hbranokmkritcdzozjli
```

(The token in memory was rotated — see `reference_supabase_token.md`.)

- [ ] **Step 3: Smoke test**

In the Supabase Functions logs, watch for the next quote send. Expect a successful 200. If you can, send a test quote with a deliberately-bad discount (e.g., 99% off) and confirm a 400 with the message "Percentage discount cannot exceed 90%".

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-quote/index.ts
git commit -m "feat(send-quote): persist + validate discount fields, gate by Pro tier"
```

---

## Task 6: CountdownBanner component

**Files:**
- Create: `src/components/quotes/CountdownBanner.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/quotes/CountdownBanner.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { formatCountdown, isDiscountActive } from '../../utils/discount';

interface CountdownBannerProps {
  discountExpiresAt: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  onExpire?: () => void;
}

export function CountdownBanner({ discountExpiresAt, discountType, discountValue, onExpire }: CountdownBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiry = new Date(discountExpiresAt).getTime();
  const remainingMs = Math.max(0, expiry - now);
  const active = isDiscountActive(discountExpiresAt) && remainingMs > 0;

  useEffect(() => {
    if (!active && onExpire) onExpire();
  }, [active, onExpire]);

  if (active) {
    const label = discountType === 'percent' ? `${discountValue}% off` : `$${discountValue} off`;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          background: '#0ea5a0',
          color: 'white',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>🕐 Limited-time offer: {label}</span>
        <span style={{ fontSize: 14, opacity: 0.95 }}>Expires in {formatCountdown(remainingMs)}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      style={{
        width: '100%',
        background: '#94a3b8',
        color: 'white',
        padding: '14px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>⏱ This offer has expired</span>
      <span style={{ fontSize: 14, opacity: 0.95, marginLeft: 8 }}>
        The original price is still valid — contact us to discuss
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/CountdownBanner.tsx
git commit -m "feat(quote): countdown banner component with live tick-down"
```

---

## Task 7: PublicQuote — render banner + discount line item

**Files:**
- Modify: `src/pages/PublicQuote.tsx`

**Pre-read context:** Today the page renders a single total via `bid.result.total` at `src/pages/PublicQuote.tsx:354`, inside a teal "Project Total" card alongside the Accept button. There is no existing "Subtotal" concept — `bid.result.total` IS the subtotal we'll discount from.

- [ ] **Step 1: Add imports**

At the top of `src/pages/PublicQuote.tsx`, add:

```ts
import { CountdownBanner } from '../components/quotes/CountdownBanner';
import { applyDiscount, isDiscountActive } from '../utils/discount';
```

- [ ] **Step 2: Compute discount state inside the component**

After the existing `useState` hooks, add:

```tsx
const [discountTick, setDiscountTick] = useState(0);

const discountConfig =
  quote?.discountType && quote?.discountValue
    ? { type: quote.discountType, value: quote.discountValue }
    : null;

const subtotal = bid?.result?.total ?? 0;
const discountLive = !!discountConfig && isDiscountActive(quote?.discountExpiresAt);
const { discountAmount, finalTotal } = discountLive && discountConfig
  ? applyDiscount(subtotal, discountConfig)
  : { discountAmount: 0, finalTotal: subtotal };

void discountTick; // re-render trigger when banner ticks past expiry
```

(`bid` and `quote` are existing variables in this file — confirm by reading the surrounding component code before adding.)

- [ ] **Step 3: Insert the banner at the very top of the page's outermost render**

The outermost wrapper is currently the public-quote container. Find the first `<div>` immediately inside `return (` (around the start of the JSX) and insert the banner as its first child:

```tsx
{quote?.discountExpiresAt && quote?.discountType && quote?.discountValue && (
  <CountdownBanner
    discountExpiresAt={quote.discountExpiresAt}
    discountType={quote.discountType}
    discountValue={quote.discountValue}
    onExpire={() => setDiscountTick((t) => t + 1)}
  />
)}
```

- [ ] **Step 4: Replace the existing Project Total card to handle the three-line case**

Locate the block at `src/pages/PublicQuote.tsx:351-368` (the teal "Project Total" card with `bid.result.total.toFixed(2)`). Replace the entire teal-card `<div>` block with the conditional version below — it preserves all existing styling and the Accept button, just adds optional Subtotal + Discount rows above the total when a live discount applies:

```tsx
<div style={{ background: brandColor, borderRadius: 10, padding: 20 }}>
  {discountLive && discountAmount > 0 && (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 }}>
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fde68a', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        <span>Limited-time discount</span>
        <span>−${discountAmount.toFixed(2)}</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.3)', marginBottom: 8 }} />
    </>
  )}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Project Total</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>${finalTotal.toFixed(2)}</div>
    </div>
    {accepted ? (
      <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
        {'✓'} Accepted
      </div>
    ) : (
      <button
        onClick={() => setShowAcceptModal(true)}
        style={{ background: 'white', color: brandColor, padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
      >
        Accept Estimate
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 5: Verify typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PublicQuote.tsx
git commit -m "feat(quote): render countdown banner and discount line on public quote page"
```

---

## Task 8: quote-notify — recompute discount at acceptance, stamp accepted_total

**Files:**
- Modify: `supabase/functions/quote-notify/index.ts`

- [ ] **Step 1: Update the function**

Open `supabase/functions/quote-notify/index.ts`. In the `event === 'accepted'` block (currently sets `updates.status`, `updates.accepted_at`, `updates.signature_text`), add discount-aware total stamping.

Replace the block that handles the `accepted` event with:

```ts
} else if (event === 'accepted') {
  updates.status = 'accepted';
  updates.accepted_at = new Date().toISOString();
  if (signatureText) updates.signature_text = signatureText;

  // Stamp the accepted_total based on whether the discount is still active server-side.
  // Source of truth at acceptance time — never trust client clock.
  const { data: bid } = await supabase
    .from('bids')
    .select('bid_data')
    .eq('id', quote.bid_id)
    .single();

  const bd = bid?.bid_data as Record<string, unknown> | null | undefined;
  const totals = bd?.totals as Record<string, unknown> | undefined;
  const subtotal = Number(
    (totals?.total ?? totals?.grandTotal ?? bd?.total ?? bd?.grandTotal) ?? 0
  ) || 0;

  let acceptedTotal = subtotal;

  if (
    quote.discount_type &&
    quote.discount_value !== null &&
    quote.discount_expires_at &&
    new Date(quote.discount_expires_at).getTime() > Date.now()
  ) {
    const value = Number(quote.discount_value);
    const raw =
      quote.discount_type === 'percent'
        ? subtotal * (value / 100)
        : value;
    const discountAmount = Math.min(raw, subtotal);
    acceptedTotal = Math.round((subtotal - discountAmount) * 100) / 100;
  }

  updates.accepted_total = acceptedTotal;
}
```

- [ ] **Step 2: Update the response payload to include `acceptedTotal`**

Find the `return new Response(...)` near the end of the function. Right now it likely returns `{ success: true }` or similar. Change it to also surface `acceptedTotal` for the accepted event so the client can reconcile if needed:

```ts
return new Response(
  JSON.stringify({
    success: true,
    ...(event === 'accepted' && updates.accepted_total !== undefined
      ? { acceptedTotal: updates.accepted_total }
      : {}),
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

(If the existing return doesn't have a body, replicate the structure of the surrounding code — the goal is to add `acceptedTotal` to the response when the event is `accepted`.)

- [ ] **Step 3: Update the client side to ignore the new field gracefully**

`notifyQuoteEvent` in `src/services/quoteService.ts` doesn't return data today. No client change needed. (Surfacing `acceptedTotal` to the UI is a parking-lot improvement for v1.5.)

- [ ] **Step 4: Deploy the edge function**

Via Supabase Dashboard (Functions tab → `quote-notify` → Deploy a new version), OR via CLI:

```bash
SUPABASE_ACCESS_TOKEN=<fresh-token> supabase functions deploy quote-notify \
  --no-verify-jwt --project-ref hbranokmkritcdzozjli
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/quote-notify/index.ts
git commit -m "feat(quote-notify): server-validate discount at acceptance, stamp accepted_total"
```

---

## Task 9: SavedBids — discount badge on sent quotes

**Files:**
- Modify: `src/pages/SavedBids.tsx`

- [ ] **Step 1: Open the file and find where each public quote is rendered**

Run: `grep -n "publicToken\|public_token\|quote\." src/pages/SavedBids.tsx | head -20`

You're looking for the row/card render that already shows status badges or quote URL info per bid. The badge will live next to those existing UI elements.

- [ ] **Step 2: Add an import**

```ts
import { isDiscountActive } from '../utils/discount';
```

- [ ] **Step 3: Add the badge JSX inline where each quote is rendered**

In the loop/render that produces each saved bid's quote info, insert this conditional badge alongside the existing status info:

```tsx
{quote?.discountExpiresAt && quote?.discountType && quote?.discountValue && (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: isDiscountActive(quote.discountExpiresAt) ? 'rgba(14, 165, 160, 0.15)' : 'rgba(148, 163, 184, 0.2)',
      color: isDiscountActive(quote.discountExpiresAt) ? '#0ea5a0' : '#64748b',
      marginLeft: 6,
    }}
  >
    🏷️ {quote.discountType === 'percent' ? `${quote.discountValue}% off` : `$${quote.discountValue} off`}
    {' · '}
    {isDiscountActive(quote.discountExpiresAt) ? 'expires soon' : 'expired'}
  </span>
)}
```

(`quote` here is whatever variable name the existing render uses for the public quote on each bid row — adapt as needed.)

- [ ] **Step 4: Verify typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat(saved-bids): badge for quotes with active or expired discount"
```

---

## Task 10: End-to-end manual verification on coatcalc.com

**Files:** None (testing only)

- [ ] **Step 1: Push the branch and let coatcalc.com deploy**

```bash
git push origin <branch-or-main>
```

Wait for DigitalOcean to redeploy (~2-3 minutes).

- [ ] **Step 2: Send a discounted quote to yourself**

Logged in as a Pro-tier user on coatcalc.com:
1. Open any saved bid.
2. Click "Send Quote".
3. Toggle "Add a limited-time discount?" → choose Percentage, value 10, expiration 5 minutes from now.
4. Customer email: a real inbox you can check.
5. Click Send.

Expected: success, email arrives with the limited-time-discount sentence.

- [ ] **Step 3: View the public quote in incognito**

Open the link from the email in incognito. Expected:
- Teal banner at the top: "🕐 Limited-time offer: 10% off · Expires in 4m 5xs"
- Subtotal / Limited-time discount / Total breakdown in the totals area
- Countdown ticks down every second

- [ ] **Step 4: Wait for expiration**

Watch the countdown hit zero. Expected:
- Banner flips to gray "⏱ This offer has expired"
- Discount line disappears from totals
- Total snaps back to subtotal
- No page reload

- [ ] **Step 5: Test acceptance with active discount**

Send another discounted quote with a 1-hour expiration. Open in incognito and click Accept while the banner is still active. Expected:
- Acceptance succeeds.
- Verify in Supabase SQL editor:

```sql
SELECT customer_name, discount_type, discount_value, discount_expires_at, accepted_at, accepted_total
FROM public_quotes
ORDER BY created_at DESC LIMIT 5;
```

The most recent row should have `accepted_total < subtotal` (the discount was applied at acceptance).

- [ ] **Step 6: Test rejection of bad discount params**

Try sending with 99% off. Expected: error toast / message saying "Percentage discount cannot exceed 90%."

Try sending with expiration in 30 minutes. Expected: error saying "Discount expiration must be at least 1 hour from now."

- [ ] **Step 7: Verify Basic-tier gating**

If you have access to a Basic-tier test org, log in there and open Send Quote. Expected: no "Add a limited-time discount?" toggle visible. (Server still rejects discount payloads with 403 if anyone tries to bypass the UI.)

- [ ] **Step 8: Verify SavedBids badge**

On the painter dashboard saved-bids page, the bid you discounted should show a teal `🏷️ 10% off · expires soon` badge while active, and a gray `🏷️ 10% off · expired` badge after expiration.

- [ ] **Step 9: No commit; this is verification only**

If anything failed: stop, surface the issue, fix it, repeat from the failing step. Do not declare the feature complete until every step passes.

---

## Out of Scope (parking lot)

Tracked in the spec under "Out of Scope":
- Painter "Extend offer" action on already-sent quotes
- Org-wide promotional campaigns
- Multiple concurrent discounts (BOGO, tiered)
- Customer-side "lock in this price now" deposit (integration point with the upcoming customer-payments feature)
- Email reminder when discount is about to expire
- Surfacing `acceptedTotal` to the customer UI on acceptance success
