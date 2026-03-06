import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Get org for this user
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(name, stripe_customer_id)')
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return new Response('Only owners can manage billing', { status: 403 });
    }

    const org = membership.organizations as unknown as { name: string; stripe_customer_id: string | null };

    // Create or reuse Stripe customer
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/app?billing=success`,
      cancel_url: `${req.headers.get('origin')}/app?billing=canceled`,
      subscription_data: {
        trial_period_days: 0, // They already had a trial
        metadata: { organization_id: membership.organization_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
