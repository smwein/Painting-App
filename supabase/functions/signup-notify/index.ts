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
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Send email + push notification in parallel
    const [emailResult] = await Promise.all([
      sendEmail({
        to: 'admincoatcalc@gmail.com',
        subject: `New signup: ${companyName}`,
        html,
      }),
      fetch('https://ntfy.sh/Coatcalc-signup', {
        method: 'POST',
        body: `New signup: ${companyName} (${userEmail})`,
        headers: { Title: 'New CoatCalc Signup' },
      }).catch(() => {}),
    ]);

    return new Response(JSON.stringify({ success: true, id: emailResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
