import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'sb-hbranokmkritcdzozjli-auth-token',
      flowType: 'pkce',
    },
  }
);
