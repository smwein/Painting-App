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
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { email, token, orgName, role } = await req.json();
    if (!email || !token || !orgName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inviteUrl = `https://www.coatcalc.com/invite/${token}`;
    const roleLabel = role === 'admin' ? 'an Admin' : 'an Estimator';

    const html = brandedEmail({
      preheader: `${orgName} has invited you to join their team on CoatCalc`,
      heading: `You've been invited to join ${orgName} on CoatCalc`,
      body: `${orgName} has invited you to collaborate on their painting estimates as ${roleLabel}. Click below to accept the invitation and get started.`,
      ctaText: 'Accept Invite',
      ctaUrl: inviteUrl,
    });

    const data = await sendEmail({
      to: email,
      subject: `You've been invited to join ${orgName} on CoatCalc`,
      html,
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
