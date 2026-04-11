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
