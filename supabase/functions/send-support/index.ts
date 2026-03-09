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
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = brandedEmail({
      preheader: `Support request from ${name}: ${subject}`,
      heading: `Support: ${subject}`,
      body: `<strong>From:</strong> ${name} (${email})<br/><br/><strong>Category:</strong> ${subject}<br/><br/><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}`,
      ctaText: `Reply to ${name}`,
      ctaUrl: `mailto:${email}`,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CoatCalc Support <noreply@coatcalc.com>',
        to: ['admincoatcalc@gmail.com'],
        reply_to: email,
        subject: `[CoatCalc Support] ${subject} — from ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Resend error: ${err}` }), {
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
