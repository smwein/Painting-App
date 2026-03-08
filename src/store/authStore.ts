// Re-export Supabase auth store as the canonical auth store
// This replaces the old Firebase-based auth store
export { useSupabaseAuthStore as useAuthStore } from './supabaseAuthStore';
export type { AuthUser } from './supabaseAuthStore';
export type { MembershipRole as UserRole } from '../types/supabase.types';
