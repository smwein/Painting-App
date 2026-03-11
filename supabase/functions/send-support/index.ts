import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { brandedEmail } from '../_shared/emailTemplate.ts';

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

    const data = await sendEmail({
      to: 'admincoatcalc@gmail.com',
      subject: `[CoatCalc Support] ${subject} — from ${name}`,
      html,
      from: 'CoatCalc Support <noreply@coatcalc.com>',
      reply_to: email,
    });

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
