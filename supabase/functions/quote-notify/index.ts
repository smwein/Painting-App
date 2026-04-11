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
