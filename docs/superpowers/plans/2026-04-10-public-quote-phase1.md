# Public Quote System — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable estimators to send a shareable link to customers who can view a branded quote page and accept with a typed signature.

**Architecture:** New `public_quotes` Supabase table holds sent quote metadata + tokens. A public React page at `/quote/:token` fetches the quote and bid data without auth. A Supabase edge function sends the email and creates the record. A second edge function handles status updates (viewed, accepted) from the public page. The existing bid gets a `locked` flag when sent.

**Tech Stack:** React + TypeScript, Supabase (Postgres, Edge Functions, RLS), Resend email, react-router-dom, Zustand

**Spec:** `docs/superpowers/specs/2026-04-10-public-quote-presentation-design.md`

---

### Task 1: Database Migration — public_quotes table + bids locked column

**Files:**
- Create: `supabase/migrations/006_public_quotes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add locked column to bids
ALTER TABLE bids ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- Create public_quotes table
CREATE TABLE public_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  public_token text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')),
  enabled_pages text[] NOT NULL DEFAULT ARRAY['estimate'],
  accepted_at timestamptz,
  signature_text text,
  viewed_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast token lookups (public page)
CREATE UNIQUE INDEX idx_public_quotes_token ON public_quotes(public_token);

-- Index for org-level queries (saved bids page)
CREATE INDEX idx_public_quotes_org ON public_quotes(organization_id);
CREATE INDEX idx_public_quotes_bid ON public_quotes(bid_id);

-- RLS policies
ALTER TABLE public_quotes ENABLE ROW LEVEL SECURITY;

-- Public: anyone can SELECT by token (for the public quote page)
CREATE POLICY "public_read_by_token"
  ON public_quotes FOR SELECT
  USING (true);

-- Authenticated org members can SELECT all their org's quotes
CREATE POLICY "org_members_select"
  ON public_quotes FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT user_org_ids()));

-- Authenticated org members can INSERT
CREATE POLICY "org_members_insert"
  ON public_quotes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- Authenticated org members can UPDATE their org's quotes
CREATE POLICY "org_members_update"
  ON public_quotes FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT user_org_ids()));
```

- [ ] **Step 2: Apply the migration**

Run: `cd supabase && supabase db push` (or apply via Supabase dashboard SQL editor)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_public_quotes.sql
git commit -m "feat: add public_quotes table and locked column on bids"
```

---

### Task 2: Quote Service — data layer for public quotes

**Files:**
- Create: `src/services/quoteService.ts`
- Create: `src/types/quote.types.ts`

- [ ] **Step 1: Create the quote types**

Write `src/types/quote.types.ts`:

```typescript
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
}
```

- [ ] **Step 2: Create the quote service**

Write `src/services/quoteService.ts`:

```typescript
import { supabase } from '../config/supabase';
import type { PublicQuote } from '../types/quote.types';

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
  };
}

export async function fetchQuoteByToken(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('public_token', token)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function fetchQuotesForOrg(orgId: string): Promise<PublicQuote[]> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchQuoteForBid(bidId: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('bid_id', bidId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function lockBid(bidId: string): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({ locked: true })
    .eq('id', bidId);
  if (error) throw error;
}

export async function unlockBid(bidId: string): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({ locked: false })
    .eq('id', bidId);
  if (error) throw error;
}

export async function sendQuote(params: {
  bidId: string;
  customerEmail: string;
  customerName: string;
  enabledPages: string[];
  expiresAt: string;
  organizationId: string;
}): Promise<{ publicToken: string; quoteUrl: string }> {
  const { data, error } = await supabase.functions.invoke('send-quote', {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function notifyQuoteEvent(params: {
  token: string;
  event: 'viewed' | 'accepted';
  signatureText?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('quote-notify', {
    body: params,
  });
  if (error) throw error;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/quote.types.ts src/services/quoteService.ts
git commit -m "feat: add quote types and service layer"
```

---

### Task 3: Send Quote Edge Function

**Files:**
- Create: `supabase/functions/send-quote/index.ts`

- [ ] **Step 1: Write the edge function**

Write `supabase/functions/send-quote/index.ts`:

```typescript
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

    const { bidId, customerEmail, customerName, enabledPages, expiresAt, organizationId } = await req.json();

    if (!bidId || !customerEmail || !customerName || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const publicToken = generateToken();
    const quoteUrl = `https://www.coatcalc.com/quote/${publicToken}`;

    // Create public_quotes record
    const { error: insertError } = await supabase.from('public_quotes').insert({
      organization_id: organizationId,
      bid_id: bidId,
      public_token: publicToken,
      customer_email: customerEmail,
      customer_name: customerName,
      enabled_pages: enabledPages ?? ['estimate'],
      expires_at: expiresAt,
      sent_by: user.id,
    });

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

    // Send email
    const html = brandedEmail({
      preheader: `${companyName} has sent you a painting estimate`,
      heading: `You have a new estimate from ${companyName}`,
      body: `Hi ${customerName},\n\nThank you for considering ${companyName} for your painting project. Please click below to view your estimate and accept it when you're ready.`,
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

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/send-quote/index.ts
git commit -m "feat: add send-quote edge function"
```

---

### Task 4: Quote Notify Edge Function

**Files:**
- Create: `supabase/functions/quote-notify/index.ts`

- [ ] **Step 1: Write the edge function**

This function is called from the public page (no auth) to record views and acceptances. It uses the service role key to bypass RLS.

Write `supabase/functions/quote-notify/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { brandedEmail } from '../_shared/emailTemplate.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role key — this function is called from public pages (no auth)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { token, event, signatureText } = await req.json();

    if (!token || !event) {
      return new Response(JSON.stringify({ error: 'Missing token or event' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the quote
    const { data: quote, error: fetchError } = await supabase
      .from('public_quotes')
      .select('*')
      .eq('public_token', token)
      .single();

    if (fetchError || !quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update based on event type
    const updates: Record<string, unknown> = {};

    if (event === 'viewed') {
      updates.view_count = (quote.view_count ?? 0) + 1;
      if (!quote.viewed_at) {
        updates.viewed_at = new Date().toISOString();
        updates.status = 'viewed';
      }
    } else if (event === 'accepted') {
      updates.status = 'accepted';
      updates.accepted_at = new Date().toISOString();
      if (signatureText) updates.signature_text = signatureText;
    }

    // Update the quote
    const { error: updateError } = await supabase
      .from('public_quotes')
      .update(updates)
      .eq('id', quote.id);

    if (updateError) throw updateError;

    // Send notification email to the estimator (first view or acceptance only)
    const shouldNotify =
      (event === 'viewed' && !quote.viewed_at) ||
      event === 'accepted';

    if (shouldNotify) {
      // Get estimator's email
      const { data: sender } = await supabase.auth.admin.getUserById(quote.sent_by);
      const estimatorEmail = sender?.user?.email;

      // Get customer address from bid
      const { data: bidRow } = await supabase
        .from('bids')
        .select('bid_data')
        .eq('id', quote.bid_id)
        .single();

      const customerAddress = bidRow?.bid_data?.customer?.address ?? '';

      if (estimatorEmail) {
        const isAccepted = event === 'accepted';
        const html = brandedEmail({
          preheader: isAccepted
            ? `${quote.customer_name} accepted your estimate`
            : `${quote.customer_name} viewed your estimate`,
          heading: isAccepted
            ? `Estimate Accepted!`
            : `Your Estimate Was Viewed`,
          body: isAccepted
            ? `Great news! ${quote.customer_name} has accepted your estimate for ${customerAddress}. Log in to CoatCalc to see the details.`
            : `${quote.customer_name} just viewed your estimate for ${customerAddress}. Now might be a good time to follow up!`,
          ctaText: 'View in CoatCalc',
          ctaUrl: 'https://www.coatcalc.com/app/saved-bids',
        });

        await sendEmail({
          to: estimatorEmail,
          subject: isAccepted
            ? `${quote.customer_name} accepted your estimate`
            : `${quote.customer_name} viewed your estimate`,
          html,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/quote-notify/index.ts
git commit -m "feat: add quote-notify edge function for view/accept tracking"
```

---

### Task 5: Public Quote View Page

**Files:**
- Create: `src/pages/PublicQuote.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Create the public quote page**

Write `src/pages/PublicQuote.tsx`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import type { PublicQuote } from '../types/quote.types';
import type { Bid } from '../types/bid.types';
import { notifyQuoteEvent } from '../services/quoteService';

interface QuoteData {
  quote: PublicQuote;
  bid: Bid;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  brandColor: string;
}

function mapQuoteRow(row: any): PublicQuote {
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
  };
}

export function PublicQuote() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch quote by token
      const { data: quoteRow, error: qErr } = await supabase
        .from('public_quotes')
        .select('*')
        .eq('public_token', token)
        .single();

      if (qErr || !quoteRow) {
        setError('Quote not found');
        return;
      }

      const quote = mapQuoteRow(quoteRow);

      // Check expiration
      if (new Date(quote.expiresAt) < new Date()) {
        setError('expired');
        // Fetch company info for expired message
        const { data: settingsRow } = await supabase
          .from('pricing_settings')
          .select('settings_json')
          .eq('organization_id', quote.organizationId)
          .single();
        const settings = settingsRow?.settings_json;
        setData({
          quote,
          bid: {} as Bid,
          companyName: settings?.name ?? '',
          companyPhone: settings?.phone ?? '',
          companyEmail: settings?.email ?? '',
          companyLogo: settings?.logo,
          brandColor: settings?.pricing?.presentation?.brandColor ?? '#2563eb',
        });
        return;
      }

      // Fetch bid data
      const { data: bidRow, error: bErr } = await supabase
        .from('bids')
        .select('*')
        .eq('id', quote.bidId)
        .single();

      if (bErr || !bidRow) {
        setError('Bid data not found');
        return;
      }

      const bid: Bid = {
        id: bidRow.id,
        ...(bidRow.bid_data as any),
        createdAt: new Date(bidRow.created_at),
        updatedAt: new Date(bidRow.updated_at),
      };

      // Fetch company settings
      const { data: settingsRow } = await supabase
        .from('pricing_settings')
        .select('settings_json')
        .eq('organization_id', quote.organizationId)
        .single();

      const settings = settingsRow?.settings_json;

      setData({
        quote,
        bid,
        companyName: settings?.name ?? 'Painting Company',
        companyPhone: settings?.phone ?? '',
        companyEmail: settings?.email ?? '',
        companyLogo: settings?.logo,
        brandColor: settings?.pricing?.presentation?.brandColor ?? '#2563eb',
      });

      if (quote.status === 'accepted') {
        setAccepted(true);
      }

      // Track view
      notifyQuoteEvent({ token, event: 'viewed' }).catch(() => {});
    } catch {
      setError('Failed to load quote');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const handleAccept = async () => {
    if (!signatureName.trim() || !token) return;
    setAccepting(true);
    try {
      await notifyQuoteEvent({ token, event: 'accepted', signatureText: signatureName.trim() });
      setAccepted(true);
      setShowAcceptModal(false);
    } catch {
      alert('Failed to accept. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error === 'expired' && data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Estimate Expired</h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 24px' }}>
            This estimate has expired. Please contact {data.companyName} for an updated quote.
          </p>
          {data.companyPhone && <p style={{ color: '#475569', fontSize: 14, margin: '4px 0' }}>{data.companyPhone}</p>}
          {data.companyEmail && <p style={{ color: '#475569', fontSize: 14, margin: '4px 0' }}>{data.companyEmail}</p>}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Quote Not Found</h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>This link may be invalid or the quote may have been removed.</p>
        </div>
      </div>
    );
  }

  const { quote, bid, companyName, companyPhone, companyEmail, companyLogo, brandColor } = data;

  // Build line items from bid materials (same as customer PDF)
  const lineItems: Array<{ name: string; amount?: number }> = [];
  if (bid.result.materials.items.length > 0) {
    bid.result.materials.items.forEach((item) => {
      lineItems.push({ name: item.name });
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: `2px solid ${brandColor}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {companyLogo && (
            <img src={companyLogo} alt={companyName} style={{ height: 40, borderRadius: 8 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{companyName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {[companyPhone, companyEmail].filter(Boolean).join(' \u2022 ')}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: 2 }}>
          Estimate
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Customer info card */}
        <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Estimate for</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{quote.customerName}</div>
          {bid.customer?.address && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{bid.customer.address}</div>
          )}
          {bid.customer?.jobDate && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Job Date: {new Date(bid.customer.jobDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Line items card */}
        <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scope of Work</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8 }}>Professional painting services</div>
          {lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 13 }}>
              <span style={{ color: '#475569' }}>{'\u2022'} {item.name}</span>
            </div>
          ))}
          {bid.result.materials.items.length === 0 && (
            <div style={{ fontSize: 13, color: '#475569' }}>{'\u2022'} All materials and supplies included</div>
          )}
        </div>

        {/* Total banner */}
        <div style={{ background: brandColor, borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Project Total</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>${bid.result.total.toFixed(2)}</div>
          </div>
          {accepted ? (
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              {'\u2713'} Accepted
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

        {/* Signature display if accepted */}
        {accepted && (quote.signatureText || signatureName) && (
          <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Accepted by</div>
            <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 32, color: '#1e293b' }}>
              {quote.signatureText || signatureName}
            </div>
            {quote.acceptedAt && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {new Date(quote.acceptedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '32px 0 16px', fontSize: 12, color: '#94a3b8' }}>
          Powered by CoatCalc
        </div>
      </main>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Accept This Estimate</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>Type your full name below to sign and accept this estimate.</p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Full Name</label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="John Smith"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />

            {signatureName.trim() && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Signature Preview</div>
                <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, color: '#1e293b' }}>
                  {signatureName}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowAcceptModal(false)}
                style={{ flex: 1, padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!signatureName.trim() || accepting}
                style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8, background: signatureName.trim() ? brandColor : '#94a3b8', color: 'white', fontSize: 14, fontWeight: 700, cursor: signatureName.trim() ? 'pointer' : 'not-allowed' }}
              >
                {accepting ? 'Accepting...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Font for signature */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
    </div>
  );
}
```

- [ ] **Step 2: Add the route to App.tsx**

In `src/App.tsx`, add the lazy import after the other imports (around line 22):

```typescript
const PublicQuote = lazy(() => import('./pages/PublicQuote').then(m => ({ default: m.PublicQuote })));
```

Add the route inside the `<Routes>` block, after the other public routes (after line 55):

```tsx
<Route path="/quote/:token" element={<PublicQuote />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/PublicQuote.tsx src/App.tsx
git commit -m "feat: add public quote view page with accept flow"
```

---

### Task 6: Send Quote Modal Component

**Files:**
- Create: `src/components/quotes/SendQuoteModal.tsx`

- [ ] **Step 1: Create the modal component**

Write `src/components/quotes/SendQuoteModal.tsx`:

```typescript
import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { sendQuote } from '../../services/quoteService';
import { useSettingsStore } from '../../store/settingsStore';

interface SendQuoteModalProps {
  bidId: string;
  customerName: string;
  customerEmail: string;
  organizationId: string;
  onClose: () => void;
  onSent: (quoteUrl: string) => void;
}

export function SendQuoteModal({
  bidId,
  customerName,
  customerEmail,
  organizationId,
  onClose,
  onSent,
}: SendQuoteModalProps) {
  const { settings } = useSettingsStore();
  const defaultPages = settings.pricing.presentation?.defaultPages ?? ['estimate'];

  const [email, setEmail] = useState(customerEmail);
  const [name, setName] = useState(customerName);
  const [enabledPages] = useState<string[]>(defaultPages);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim() || !name.trim()) {
      setError('Please fill in customer name and email.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const result = await sendQuote({
        bidId,
        customerEmail: email.trim(),
        customerName: name.trim(),
        enabledPages,
        expiresAt: expiresAt.toISOString(),
        organizationId,
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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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

- [ ] **Step 2: Commit**

```bash
git add src/components/quotes/SendQuoteModal.tsx
git commit -m "feat: add send quote modal component"
```

---

### Task 7: Add "Send to Customer" to ExportButtons and CalculatorPage

**Files:**
- Modify: `src/components/results/ExportButtons.tsx`
- Modify: `src/pages/CalculatorPage.tsx`

- [ ] **Step 1: Add onSendToCustomer prop to ExportButtons**

In `src/components/results/ExportButtons.tsx`, add a new prop and button. Add `onSendToCustomer?: () => void` to the props interface and a new button in the "For Customer" section:

After the existing "Generate Customer Copy" button, add:

```tsx
{onSendToCustomer && (
  <Button variant="primary" size="lg" onClick={onSendToCustomer} disabled={disabled}>
    Send to Customer
  </Button>
)}
```

- [ ] **Step 2: Wire up in CalculatorPage**

In `src/pages/CalculatorPage.tsx`, import `SendQuoteModal` and add state for the modal. After saving the bid, pass `onSendToCustomer` to `ExportButtons` that opens the modal. The modal needs `bidId`, `customerName`, `customerEmail`, and `organizationId`.

Add state:
```typescript
const [showSendModal, setShowSendModal] = useState(false);
const [sentQuoteUrl, setSentQuoteUrl] = useState<string | null>(null);
```

Pass to ExportButtons:
```tsx
onSendToCustomer={() => {
  if (!currentBid?.id) {
    alert('Please save the bid first.');
    return;
  }
  setShowSendModal(true);
}}
```

Render the modal when open:
```tsx
{showSendModal && currentBid && (
  <SendQuoteModal
    bidId={currentBid.id}
    customerName={currentBid.customer?.name ?? ''}
    customerEmail={currentBid.customer?.email ?? ''}
    organizationId={orgId}
    onClose={() => setShowSendModal(false)}
    onSent={(url) => {
      setShowSendModal(false);
      setSentQuoteUrl(url);
      alert(`Estimate sent! Link: ${url}`);
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/results/ExportButtons.tsx src/pages/CalculatorPage.tsx
git commit -m "feat: add send to customer button on calculator page"
```

---

### Task 8: Add Quote Status to Saved Bids Page

**Files:**
- Modify: `src/pages/SavedBids.tsx`

- [ ] **Step 1: Fetch quote status for each bid**

In `SavedBids.tsx`, import `fetchQuotesForOrg` from `quoteService`. In a `useEffect`, fetch all quotes for the org and build a `Map<bidId, PublicQuote>` for quick lookup.

Add state:
```typescript
const [quoteMap, setQuoteMap] = useState<Map<string, PublicQuote>>(new Map());
```

Fetch on mount:
```typescript
useEffect(() => {
  if (!orgId) return;
  fetchQuotesForOrg(orgId).then((quotes) => {
    const map = new Map<string, PublicQuote>();
    quotes.forEach((q) => map.set(q.bidId, q));
    setQuoteMap(map);
  }).catch(console.error);
}, [orgId]);
```

- [ ] **Step 2: Add status badge to each bid row**

In the bid row rendering, look up `quoteMap.get(bid.id)` and show a status badge:

```tsx
{(() => {
  const quote = quoteMap.get(bid.id);
  if (!quote) return null;
  const colors: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[quote.status] ?? ''}`}>
      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
    </span>
  );
})()}
```

- [ ] **Step 3: Add send button for unsent bids**

Add a "Send" button on bid rows that don't have a quote yet. Import `SendQuoteModal` and add modal state similar to Task 7.

- [ ] **Step 4: Show lock icon for locked bids**

Check `bid.locked` (will need to add this to the Bid type or read from the raw Supabase row) and show a lock icon next to the bid name.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedBids.tsx
git commit -m "feat: add quote status badges and send button to saved bids"
```

---

### Task 9: Bid Locking UI

**Files:**
- Modify: `src/pages/CalculatorPage.tsx`
- Modify: `src/services/quoteService.ts` (already has lock/unlock functions)

- [ ] **Step 1: Detect locked bid on calculator page**

When a bid is loaded on the calculator page, check if it's locked. If locked, show a banner at the top:

```tsx
{loadedBid?.locked && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-yellow-600 text-lg">{'\uD83D\uDD12'}</span>
      <span className="text-sm text-yellow-800 font-medium">
        This bid has been sent to the customer. It is locked to prevent accidental changes.
      </span>
    </div>
    <button
      onClick={async () => {
        if (confirm('Changes will be visible to the customer immediately. Unlock this bid?')) {
          await unlockBid(loadedBid.id);
          // Reload or update local state
        }
      }}
      className="text-sm text-yellow-700 hover:text-yellow-900 font-medium underline"
    >
      Unlock to Edit
    </button>
  </div>
)}
```

- [ ] **Step 2: Disable calculator inputs when locked**

In `CalculatorPage.tsx`, wrap the calculator rendering to pass a `disabled` prop. Each calculator component (`InteriorDetailed`, `ExteriorDetailed`, `InteriorSquareFootage`, `ExteriorSquareFootage`, `PerRoomDetailed`) should check for a `disabled` prop and add `pointer-events: none; opacity: 0.6` to the form wrapper `<div>` when true. This is a CSS-only approach — no need to disable individual inputs.

```tsx
<div style={loadedBid?.locked ? { pointerEvents: 'none', opacity: 0.6 } : undefined}>
  {renderCalculator()}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CalculatorPage.tsx
git commit -m "feat: add bid locking UI with unlock warning"
```

---

### Task 10: Add presentation.brandColor to settings

**Files:**
- Modify: `src/types/settings.types.ts`
- Modify: `src/core/constants/defaultPricing.ts`
- Modify: `src/store/settingsStore.ts`

- [ ] **Step 1: Add PresentationSettings type**

In `src/types/settings.types.ts`, add:

```typescript
export interface PresentationSettings {
  brandColor: string;
  defaultPages: string[];
}
```

Add to `PricingSettings` interface:

```typescript
presentation?: PresentationSettings;
```

- [ ] **Step 2: Add defaults**

In `src/core/constants/defaultPricing.ts`, add to the default pricing object:

```typescript
presentation: {
  brandColor: '#2563eb',
  defaultPages: ['estimate'],
},
```

- [ ] **Step 3: Seed for existing orgs**

In `src/store/settingsStore.ts`, add to `ensureNewPricingFields`:

```typescript
if (p.presentation === undefined) {
  updates.presentation = defaults.presentation;
  changed = true;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/settings.types.ts src/core/constants/defaultPricing.ts src/store/settingsStore.ts
git commit -m "feat: add presentation settings with brand color"
```
