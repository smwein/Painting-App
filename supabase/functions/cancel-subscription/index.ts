// supabase/functions/cancel-subscription/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const BASIC_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID_BASIC')!;
const RETENTION_COUPON_ID = Deno.env.get('STRIPE_RETENTION_COUPON_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'downgrade' | 'accept_offer' | 'cancel' | 'resume';
type Reason = 'too_expensive' | 'missing_features' | 'switching_tools' | 'seasonal' | 'other';

const VALID_ACTIONS: Action[] = ['downgrade', 'accept_offer', 'cancel', 'resume'];
const VALID_REASONS: Reason[] = ['too_expensive', 'missing_features', 'switching_tools', 'seasonal', 'other'];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, reason } = await req.json().catch(() => ({}));

    if (!VALID_ACTIONS.includes(action)) {
      return json(400, { error: 'Invalid action' });
    }
    if (action !== 'resume' && !VALID_REASONS.includes(reason)) {
      return json(400, { error: 'Invalid reason' });
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Unauthorized' });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: 'Unauthorized' });

    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(stripe_subscription_id, plan_status, plan_tier)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return json(403, { error: 'Only owners can manage billing' });
    }

    const org = membership.organizations as unknown as {
      stripe_subscription_id: string | null;
      plan_status: string;
      plan_tier: 'basic' | 'pro';
    };

    if (!org.stripe_subscription_id) {
      return json(400, { error: 'No active subscription' });
    }

    // Service-role client for writes (bypasses RLS on cancellation_events insert + org update)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const subId = org.stripe_subscription_id;
    const orgId = membership.organization_id;

    // Dispatch by action
    if (action === 'resume') {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
      return json(200, { ok: true, outcome: 'resumed' });
    }

    if (action === 'downgrade') {
      const sub = await stripe.subscriptions.retrieve(subId);
      const itemId = sub.items.data[0]?.id;
      if (!itemId) return json(500, { error: 'Subscription has no items' });
      await stripe.subscriptions.update(subId, {
        items: [{ id: itemId, price: BASIC_PRICE_ID }],
        proration_behavior: 'create_prorations',
      });
      await admin.from('organizations')
        .update({ plan_tier: 'basic' })
        .eq('id', orgId);
      await admin.from('cancellation_events').insert({
        organization_id: orgId,
        user_id: user.id,
        reason,
        outcome: 'downgrade',
        plan_tier_at_event: org.plan_tier,
      });
      return json(200, { ok: true, outcome: 'downgrade' });
    }

    if (action === 'accept_offer') {
      await stripe.subscriptions.update(subId, {
        discounts: [{ coupon: RETENTION_COUPON_ID }],
      });
      await admin.from('organizations')
        .update({ retention_offer_used_at: new Date().toISOString() })
        .eq('id', orgId);
      await admin.from('cancellation_events').insert({
        organization_id: orgId,
        user_id: user.id,
        reason,
        outcome: 'accepted_offer',
        plan_tier_at_event: org.plan_tier,
      });
      return json(200, { ok: true, outcome: 'accepted_offer' });
    }

    // action === 'cancel'
    if (org.plan_status === 'trialing') {
      await stripe.subscriptions.cancel(subId);
    } else {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }
    await admin.from('cancellation_events').insert({
      organization_id: orgId,
      user_id: user.id,
      reason,
      outcome: 'canceled',
      plan_tier_at_event: org.plan_tier,
    });
    return json(200, { ok: true, outcome: 'canceled' });

  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
