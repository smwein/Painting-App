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
