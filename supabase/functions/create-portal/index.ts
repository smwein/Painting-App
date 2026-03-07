import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

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

    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(stripe_customer_id)')
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return new Response('Only owners can manage billing', { status: 403 });
    }

    const org = membership.organizations as unknown as { stripe_customer_id: string | null };

    if (!org.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No billing account found' }), { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/app/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
