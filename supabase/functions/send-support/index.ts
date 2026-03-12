import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { brandedEmail } from '../_shared/emailTemplate.ts';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    const html = brandedEmail({
      preheader: `Support request from ${safeName}: ${safeSubject}`,
      heading: `Support: ${safeSubject}`,
      body: `<strong>From:</strong> ${safeName} (${safeEmail})<br/><br/><strong>Category:</strong> ${safeSubject}<br/><br/><strong>Message:</strong><br/>${safeMessage}`,
      ctaText: `Reply to ${safeName}`,
      ctaUrl: `mailto:${email}`,
    });

    const data = await sendEmail({
      to: 'admincoatcalc@gmail.com',
      subject: `[CoatCalc Support] ${safeSubject} — from ${safeName}`,
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
