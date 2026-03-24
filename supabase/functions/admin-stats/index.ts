import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPER_ADMIN_ID = '75bbc37d-ca23-4a32-9dbb-265780af7370';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.coatcalc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify caller identity using anon client (respects JWT)
    const authHeader = req.headers.get('Authorization')!;
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user || user.id !== SUPER_ADMIN_ID) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Service role client for unrestricted queries
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Run all queries in parallel
    const [
      companiesRes,
      bidsByTypeRes,
      bidsByStatusRes,
      bidsLast7Res,
      bidsLast30Res,
      orgsLast7Res,
      orgsLast30Res,
      totalUsersRes,
      expiringTrialsRes,
    ] = await Promise.all([
      admin.rpc('admin_company_stats'),
      admin.from('bids').select('calculator_type').then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((b: { calculator_type: string }) => {
          counts[b.calculator_type] = (counts[b.calculator_type] || 0) + 1;
        });
        return counts;
      }),
      admin.from('bids').select('status').then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((b: { status: string }) => {
          counts[b.status] = (counts[b.status] || 0) + 1;
        });
        return counts;
      }),
      admin.from('bids').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      admin.from('bids').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      admin.from('organizations').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      admin.from('organizations').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      admin.from('memberships').select('user_id'),
      admin.from('organizations').select('id, name, trial_ends_at')
        .eq('plan_status', 'trialing')
        .lte('trial_ends_at', new Date(Date.now() + 7 * 86400000).toISOString()),
    ]);

    const companies = companiesRes.data ?? [];
    const totalOrgs = companies.length;
    const totalBids = companies.reduce((sum: number, c: { bid_count: number }) => sum + c.bid_count, 0);
    const activeSubscriptions = companies.filter((c: { plan_status: string }) => c.plan_status === 'active').length;
    const uniqueUsers = new Set((totalUsersRes.data ?? []).map((m: { user_id: string }) => m.user_id));

    const response = {
      summary: {
        totalOrgs,
        totalUsers: uniqueUsers.size,
        totalBids,
        activeSubscriptions,
      },
      companies: companies.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        planStatus: c.plan_status,
        trialEndsAt: c.trial_ends_at,
        createdAt: c.created_at,
        memberCount: c.member_count,
        bidCount: c.bid_count,
        lastBidDate: c.last_bid_date,
      })),
      bidsByType: bidsByTypeRes,
      bidsByStatus: bidsByStatusRes,
      activity: {
        bidsLast7Days: bidsLast7Res.count ?? 0,
        bidsLast30Days: bidsLast30Res.count ?? 0,
        newOrgsLast7Days: orgsLast7Res.count ?? 0,
        newOrgsLast30Days: orgsLast30Res.count ?? 0,
      },
      expiringTrials: (expiringTrialsRes.data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        trialEndsAt: t.trial_ends_at,
      })),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
