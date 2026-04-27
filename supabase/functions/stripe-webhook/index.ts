import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map Stripe price IDs to plan tiers
const PRICE_TO_TIER: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_ID_BASIC') ?? '']: 'basic',
  [Deno.env.get('STRIPE_PRICE_ID_PRO') ?? '']: 'pro',
};

function getTierFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price?.id ?? '';
  return PRICE_TO_TIER[priceId] ?? 'basic';
}

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          const tier = getTierFromSubscription(sub);
          await supabase.from('organizations').update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_status: 'active',
            plan_tier: tier,
          }).eq('id', orgId);

          // Push notification: new paid customer
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single();
          const companyName = org?.name ?? 'Unknown company';
          const customerEmail =
            session.customer_email ?? session.customer_details?.email ?? '(no email)';
          fetch('https://ntfy.sh/Coatcalc-signup', {
            method: 'POST',
            body: `${companyName}\n${tier} plan · ${customerEmail}`,
            headers: {
              Title: '💰 New paid customer',
              Tags: 'moneybag',
              Priority: '4',
            },
          }).catch(() => {});
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata.organization_id;
      if (orgId) {
        await supabase.from('organizations').update({
          plan_tier: getTierFromSubscription(sub),
          cancel_at_period_end: sub.cancel_at_period_end,
        }).eq('id', orgId);
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          await supabase.from('organizations').update({ plan_status: 'active' }).eq('id', orgId);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const orgId = sub.metadata.organization_id;
        if (orgId) {
          await supabase.from('organizations').update({ plan_status: 'past_due' }).eq('id', orgId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata.organization_id;
      if (orgId) {
        await supabase.from('organizations').update({
          plan_status: 'canceled',
          cancel_at_period_end: false,
        }).eq('id', orgId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
