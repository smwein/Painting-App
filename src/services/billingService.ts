import { supabase } from '../config/supabase';
import type { PlanTier } from '../types/supabase.types';

export async function createCheckoutSession(tier: PlanTier = 'basic'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { tier },
  });

  if (error) throw error;
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-portal');

  if (error) throw error;
  return data.url;
}
