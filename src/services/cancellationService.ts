// src/services/cancellationService.ts
import { supabase } from '../config/supabase';
import type { CancellationReason } from '../types/supabase.types';

export type CancellationAction = 'downgrade' | 'accept_offer' | 'cancel' | 'resume';

export interface CancellationResult {
  ok: true;
  outcome: 'downgrade' | 'accepted_offer' | 'canceled' | 'resumed';
}

export async function submitCancellation(
  action: CancellationAction,
  reason?: CancellationReason,
): Promise<CancellationResult> {
  const body: Record<string, unknown> = { action };
  if (action !== 'resume') {
    if (!reason) throw new Error('Reason required for this action');
    body.reason = reason;
  }

  const { data, error } = await supabase.functions.invoke('cancel-subscription', { body });
  if (error) throw error;
  return data as CancellationResult;
}
