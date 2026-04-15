import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

const PRICE_IDS: Record<string, string> = {
  basic: Deno.env.get('STRIPE_PRICE_ID_BASIC')!,
  pro: Deno.env.get('STRIPE_PRICE_ID_PRO')!,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tier = 'basic' } = await req.json().catch(() => ({}));

    if (tier !== 'basic' && tier !== 'pro') {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceId = PRICE_IDS[tier];

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(name, stripe_customer_id)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return new Response('Only owners can manage billing', { status: 403 });
    }

    const org = membership.organizations as unknown as { name: string; stripe_customer_id: string | null };

    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { organization_id: membership.organization_id },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', membership.organization_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/app?billing=success`,
      cancel_url: `${req.headers.get('origin')}/app?billing=canceled`,
      subscription_data: {
        metadata: { organization_id: membership.organization_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
