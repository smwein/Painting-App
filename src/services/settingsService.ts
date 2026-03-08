import { supabase } from '../config/supabase';
import type { PricingSettings } from '../types/settings.types';

export async function fetchPricingSettings(orgId: string): Promise<PricingSettings | null> {
  const { data, error } = await supabase
    .from('pricing_settings')
    .select('settings_json')
    .eq('organization_id', orgId)
    .single();

  if (error || !data) return null;
  return data.settings_json as unknown as PricingSettings;
}

export async function savePricingSettings(orgId: string, settings: PricingSettings): Promise<void> {
  const { error } = await supabase
    .from('pricing_settings')
    .update({
      settings_json: settings as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);

  if (error) throw error;
}
