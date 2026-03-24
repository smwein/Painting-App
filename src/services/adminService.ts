import { supabase } from '../config/supabase';

export interface AdminStats {
  summary: {
    totalOrgs: number;
    totalUsers: number;
    totalBids: number;
    activeSubscriptions: number;
  };
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    planStatus: string;
    trialEndsAt: string | null;
    createdAt: string;
    memberCount: number;
    bidCount: number;
    lastBidDate: string | null;
  }>;
  bidsByType: Record<string, number>;
  bidsByStatus: Record<string, number>;
  activity: {
    bidsLast7Days: number;
    bidsLast30Days: number;
    newOrgsLast7Days: number;
    newOrgsLast30Days: number;
  };
  expiringTrials: Array<{
    id: string;
    name: string;
    trialEndsAt: string;
  }>;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'Access denied' : 'Failed to fetch stats');
  }

  return response.json();
}
