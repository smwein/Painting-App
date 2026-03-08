import { supabase } from '../config/supabase';

export async function createCheckoutSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout');

  if (error) throw error;
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-portal');

  if (error) throw error;
  return data.url;
}
