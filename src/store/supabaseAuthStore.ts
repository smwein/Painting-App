import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { MembershipRole } from '../types/supabase.types';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: MembershipRole;
  organizationId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

async function resolveUserProfile(supabaseUser: User): Promise<AuthUser> {
  // Look up membership to get role + org
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, organization_id')
    .eq('user_id', supabaseUser.id)
    .limit(1)
    .maybeSingle();

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName:
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      supabaseUser.email ?? '',
    photoURL: supabaseUser.user_metadata?.avatar_url ?? null,
    role: membership?.role ?? 'owner',
    organizationId: membership?.organization_id ?? null,
  };
}

export const useSupabaseAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        resolveUserProfile(session.user).then((profile) => {
          set({ user: profile, loading: false });
        }).catch(() => {
          set({ user: null, loading: false });
        });
      } else {
        set({ user: null, loading: false });
      }
    }).catch(() => {
      set({ user: null, loading: false });
    });

    // Listen for auth changes
    // IMPORTANT: Do not await inside onAuthStateChange — it blocks the Supabase
    // auth client and prevents subsequent requests (including our own queries).
    // Instead, set a basic user immediately and resolve the full profile after.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (session?.user) {
          // Resolve full profile outside the callback to avoid deadlocking
          // the Supabase auth client (it blocks if you await inside onAuthStateChange)
          const user = session.user;
          setTimeout(() => {
            resolveUserProfile(user).then((profile) => {
              set({ user: profile, loading: false, error: null });
            }).catch(() => {
              set({
                user: {
                  uid: user.id,
                  email: user.email ?? '',
                  displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '',
                  photoURL: user.user_metadata?.avatar_url ?? null,
                  role: 'owner',
                  organizationId: null,
                },
                loading: false,
                error: null,
              });
            });
          }, 0);
        } else {
          set({ user: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) set({ error: error.message });
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) set({ error: error.message });
    } catch (err) {
      set({ error: 'Unable to connect. Please try again.' });
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      set({ error: error.message });
    } else {
      set({ error: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
