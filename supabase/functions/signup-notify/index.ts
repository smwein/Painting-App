import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { brandedEmail } from '../_shared/emailTemplate.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userEmail, companyName } = await req.json();
    if (!userEmail || !companyName) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = brandedEmail({
      preheader: `New signup: ${companyName} (${userEmail})`,
      heading: 'New CoatCalc Signup',
      body: `<strong>${companyName}</strong> just signed up for CoatCalc.<br/><br/><strong>Email:</strong> ${userEmail}`,
      ctaText: 'View Dashboard',
      ctaUrl: 'https://supabase.com/dashboard/project/hbranokmkritcdzozjli',
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CoatCalc <noreply@coatcalc.com>',
        to: ['admincoatcalc@gmail.com'],
        subject: `New signup: ${companyName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
