import { supabase } from '../config/supabase';
import type { PublicQuote } from '../types/quote.types';

function mapRow(row: any): PublicQuote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bidId: row.bid_id,
    publicToken: row.public_token,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    enabledPages: row.enabled_pages,
    acceptedAt: row.accepted_at,
    signatureText: row.signature_text,
    viewedAt: row.viewed_at,
    viewCount: row.view_count,
    expiresAt: row.expires_at,
    sentBy: row.sent_by,
    createdAt: row.created_at,
  };
}

export async function fetchQuoteByToken(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('public_token', token)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function fetchQuotesForOrg(orgId: string): Promise<PublicQuote[]> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function fetchQuoteForBid(bidId: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase
    .from('public_quotes')
    .select('*')
    .eq('bid_id', bidId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function lockBid(bidId: string): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({ locked: true })
    .eq('id', bidId);
  if (error) throw error;
}

export async function unlockBid(bidId: string): Promise<void> {
  const { error } = await supabase
    .from('bids')
    .update({ locked: false })
    .eq('id', bidId);
  if (error) throw error;
}

export async function sendQuote(params: {
  bidId: string;
  customerEmail: string;
  customerName: string;
  enabledPages: string[];
  expiresAt: string;
  organizationId: string;
}): Promise<{ publicToken: string; quoteUrl: string }> {
  const { data, error } = await supabase.functions.invoke('send-quote', {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function notifyQuoteEvent(params: {
  token: string;
  event: 'viewed' | 'accepted';
  signatureText?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('quote-notify', {
    body: params,
  });
  if (error) throw error;
}
