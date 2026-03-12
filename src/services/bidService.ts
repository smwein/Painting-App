import { supabase } from '../config/supabase';
import type { Bid } from '../types/bid.types';

export async function fetchBids(orgId: string, userId?: string): Promise<Bid[]> {
  let query = supabase
    .from('bids')
    .select('*')
    .eq('organization_id', orgId);

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    ...(row.bid_data as unknown as Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

export async function saveBid(
  orgId: string,
  userId: string,
  bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const { data, error } = await supabase
    .from('bids')
    .insert({
      organization_id: orgId,
      created_by: userId,
      calculator_type: bid.calculatorType,
      customer_name: bid.customer.name,
      bid_data: bid as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (error || !data) throw error || new Error('Failed to save bid');
  return data.id;
}

export async function updateBid(bidId: string, updates: Partial<Bid>): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({
      bid_data: updates as unknown as Record<string, unknown>,
      customer_name: updates.customer?.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bidId);

  if (error) throw error;
}

export async function deleteBid(bidId: string): Promise<void> {
  const { error } = await supabase.from('bids').delete().eq('id', bidId);
  if (error) throw error;
}
